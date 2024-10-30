import { ActivityHandler, TurnContext, MessageFactory, Attachment } from 'botbuilder';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { SearchClient } from '@azure/search-documents';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import fetch from 'node-fetch';
import pdf from 'pdf-parse';
import { azureOpenAIConfig, azureSearchConfig, azureStorageConfig, credentialsConfig } from './config';

// Define interfaces
interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface SearchDocument {
    id: string;
    content: string;
    title: string;
    category: string;
    timestamp: string;
    fileType: string;
    source: string;
    uploadedBy?: string;
    fileName?: string;
    [key: string]: unknown;
}


export class TeamsBot extends ActivityHandler {
    // Use definite assignment assertions for required properties
    private openAIClient!: OpenAIClient;
    private searchClient!: SearchClient<SearchDocument>;
    private blobClient!: BlobServiceClient;
    private conversationHistory: Map<string, ChatMessage[]>;
    
    // Constants can be declared and initialized immediately
    private readonly MAX_HISTORY_LENGTH = 10;
    private readonly SUPPORTED_FILE_TYPES = ['.txt', '.md', '.csv', '.json', '.pdf'];

    constructor() {
        super();
        
        // Initialize the conversation history map
        this.conversationHistory = new Map<string, ChatMessage[]>();
        
        // Initialize all clients
        this.initializeClients();
        
        // Set up handlers
        this.setupHandlers();
    }

    private initializeClients(): void {
        try {
            // Initialize OpenAI client
            const openAIEndpoint = azureOpenAIConfig.endpoint;
            const openAIKey = azureOpenAIConfig.apiKey;
            
            if (!openAIEndpoint || !openAIKey) {
                throw new Error('Azure OpenAI configuration missing');
            }
            
            this.openAIClient = new OpenAIClient(
                openAIEndpoint,
                new AzureKeyCredential(openAIKey)
            );

            // Initialize Search client
            const searchEndpoint = azureSearchConfig.endpoint;
            const searchKey = azureSearchConfig.apiKey;
            const searchIndex = azureSearchConfig.indexName;
            
            if (!searchEndpoint || !searchKey || !searchIndex) {
                throw new Error('Azure Search configuration missing');
            }
            
            this.searchClient = new SearchClient<SearchDocument>(
                searchEndpoint,
                searchIndex,
                new AzureKeyCredential(searchKey)
            );

            // Initialize Blob Storage client
            const storageAccount = azureStorageConfig.accountName;
            const storageKey = azureStorageConfig.accountKey;
            
            if (!storageAccount || !storageKey) {
                throw new Error('Azure Storage configuration missing');
            }
            
            this.blobClient = new BlobServiceClient(
                `https://${storageAccount}.blob.core.windows.net`,
                new StorageSharedKeyCredential(storageAccount, storageKey)
            );

            console.log('All clients initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize clients:', error);
            throw new Error('Client initialization failed: ' + (error as Error).message);
        }
    }

    private setupHandlers(): void {
        // Handler setup code remains the same...
        this.onMessage(async (context: TurnContext) => {
            try {
                await context.sendActivity({ type: 'typing' });

                if (context.activity.attachments && context.activity.attachments.length > 0) {
                    await this.handleFileUpload(context);
                } else {
                    await this.handleMessage(context);
                }
            } catch (error) {
                console.error('Error in message handler:', error);
                await context.sendActivity('I encountered an error processing your request. Please try again.');
            }
        });

        this.onMembersAdded(async (context: TurnContext) => {
            await this.handleMembersAdded(context);
        });
    }

    private async handleMessage(context: TurnContext): Promise<void> {
        const message = context.activity.text?.trim();
        if (!message) return;

        try {
            if (message.startsWith('/')) {
                await this.handleCommands(context);
                return;
            }

            const conversationId = context.activity.conversation.id;
            const history = this.conversationHistory.get(conversationId) || [];

            // Check if there's a recent file upload in history
            const hasRecentFileUpload = history.some(msg => 
                msg.role === "system" && 
                typeof msg.content === "string" && 
                msg.content.includes("User uploaded file")
            );

            if (hasRecentFileUpload) {
                await this.handleFileQuery(context, history);
            } else {
                await this.handleGeneralQuery(context, history);
            }

        } catch (error) {
            console.error('Error handling message:', error);
            await context.sendActivity('I encountered an error processing your request.');
        }
    }

    private async handleFileUpload(context: TurnContext): Promise<void> {
        if (!context.activity.attachments || context.activity.attachments.length === 0) {
            await context.sendActivity('No attachments found.');
            return;
        }
        const attachment = context.activity.attachments[0];
        const fileExtension = attachment.name ? this.getFileExtension(attachment.name) : '';

        if (!this.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
            await context.sendActivity('Unsupported file type.');
            return;
        }

        try {
            const fileContent = await this.downloadAttachment(attachment);
            let textContent = '';

            if (fileExtension === '.pdf') {
                const buffer = Buffer.from(fileContent, 'binary');
                textContent = await this.extractTextFromPDF(buffer);
            } else {
                textContent = fileContent;
            }

            // Process the text content as needed
            const analysis = await this.analyzeContent(textContent);
            await context.sendActivity(analysis);

        } catch (error) {
            console.error('Error handling file upload:', error);
            await context.sendActivity('Failed to process the uploaded file.');
        }
    }

    private async handleFileQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const query = context.activity.text;
        if (!query) return;

        const fileEntry = [...history]
            .reverse()
            .find(msg => 
                msg.role === "system" && 
                typeof msg.content === "string" && 
                msg.content.includes("User uploaded file")
            );

        if (!fileEntry) {
            await this.handleGeneralQuery(context, history);
            return;
        }

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "You are an AI assistant analyzing a file. Provide specific answers based on the file content."
            },
            fileEntry,
            {
                role: "user",
                content: query
            }
        ];

        try {
            const completion = await this.openAIClient.getChatCompletions(
                azureOpenAIConfig.deploymentName!,
                messages,
                {
                    temperature: 0.7,
                    maxTokens: 800
                }
            );

            const responseContent = completion.choices[0]?.message?.content;
            await context.sendActivity(responseContent || 'Unable to analyze the file content.');

        } catch (error) {
            console.error('Error getting chat completion:', error);
            await context.sendActivity('I encountered an error analyzing the file. Please try again.');
        }
    }

    private async handleGeneralQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const query = context.activity.text;
        if (!query) return;

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "You are a helpful AI assistant in Microsoft Teams."
            },
            ...history.slice(-this.MAX_HISTORY_LENGTH),
            {
                role: "user",
                content: query
            }
        ];

        try {
            const completion = await this.openAIClient.getChatCompletions(
                azureOpenAIConfig.deploymentName!,
                messages,
                {
                    temperature: 0.7,
                    maxTokens: 800
                }
            );

            const responseContent = completion.choices[0]?.message?.content;
            await context.sendActivity(responseContent || 'I apologize, I could not generate a response.');

            // Update conversation history
            if (responseContent) {
                history.push({
                    role: "assistant",
                    content: responseContent
                });
                this.conversationHistory.set(context.activity.conversation.id, history);
            }

        } catch (error) {
            console.error('Error in general query:', error);
            await context.sendActivity('I encountered an error processing your request.');
        }
    }

    private async handleCommands(context: TurnContext): Promise<void> {
        const message = context.activity.text?.toLowerCase();
        
        switch (message) {
            case '/help':
                await context.sendActivity(`
Available commands:
- /help - Show this help message
- /clear - Clear conversation history
- /files - List recently uploaded files

You can also:
- Upload files for analysis
- Ask questions about uploaded files
- Get help with technical topics
                `);
                break;

            case '/clear':
                const conversationId = context.activity.conversation.id;
                this.conversationHistory.delete(conversationId);
                await context.sendActivity('Conversation history cleared.');
                break;

            case '/files':
                const searchOptions = {
                    filter: "source eq 'user-upload'",
                    select: ['fileName', 'timestamp'] as string[],
                    top: 5,
                    orderBy: ['timestamp desc'] as string[]
                };

                const searchResults = await this.searchClient.search('*', searchOptions);

                let fileList = 'Recently uploaded files:\n';
                for await (const result of searchResults.results) {
                    const timestamp = result.document.timestamp as string;
                    const fileName = result.document.fileName as string;
                    fileList += `- ${fileName} (${new Date(timestamp).toLocaleString()})\n`;
                }

                await context.sendActivity(fileList);
                break;

            default:
                await context.sendActivity('Unknown command. Type /help for available commands.');
                break;
        }
    }

    private async analyzeContent(content: string): Promise<string> {
        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "You are an AI assistant that analyzes documents. Provide a brief initial analysis of the uploaded content, including type of content, structure, and key elements found."
            },
            {
                role: "user",
                content: `Please analyze this content:\n\n${content.substring(0, 2000)}...`
            }
        ];

        try {
            const completion = await this.openAIClient.getChatCompletions(
                azureOpenAIConfig.deploymentName!,
                messages
            );

            return completion.choices[0]?.message?.content || 'Unable to analyze content.';
        } catch (error) {
            console.error('Error analyzing content:', error);
            return 'An error occurred while analyzing the content.';
        }
    }

    private async downloadAttachment(attachment: Attachment): Promise<string> {
        if (!attachment.contentUrl) {
            throw new Error('No content URL in attachment');
        }

        const response = await fetch(attachment.contentUrl);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return await response.text();
    }

    private getFileExtension(filename: string): string {
        const match = filename.match(/\.[0-9a-z]+$/i);
        return match ? match[0].toLowerCase() : '';
    }

    private async handleMembersAdded(context: TurnContext): Promise<void> {
        const welcomeText = `👋 Hello! I'm your AI assistant for Teams. I can help you:

- Analyze uploaded files
- Answer questions about documents
- Provide explanations and insights

Try uploading a file or type /help to see available commands.`;

        for (const member of context.activity.membersAdded || []) {
            if (member.id !== context.activity.recipient.id) {
                await context.sendActivity(welcomeText);
                await context.sendActivity(MessageFactory.suggestedActions(
                    [
                        'Upload a file',
                        'Show commands',
                        'Help'
                    ],
                    'What would you like to do?'
                ));
            }
        }
    }

    private async extractTextFromPDF(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }
}