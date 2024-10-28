import { ActivityHandler, TurnContext } from 'botbuilder';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { SearchClient, AzureKeyCredential as SearchKeyCredential } from '@azure/search-documents';
import config from './config';

export interface SearchDocument {
    content: string;
    [key: string]: unknown;
}

interface ChatRequestMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export class TeamsBot extends ActivityHandler {
    private client: OpenAIClient;
    private searchClient: SearchClient<SearchDocument>;

    constructor() {
        super();

        // Debug logging
        console.log('Azure OpenAI Configuration:', {
            endpoint: config.azureOpenAI?.endpoint,
            apiKey: config.azureOpenAI?.apiKey ? '[REDACTED]' : 'undefined',
            deploymentName: config.azureOpenAI?.deploymentName
        });

        console.log('Azure Search Configuration:', {
            endpoint: config.azureSearch?.endpoint,
            indexName: config.azureSearch?.indexName,
            apiKey: config.azureSearch?.apiKey ? '[REDACTED]' : 'undefined'
        });

        // Initialize OpenAI client
        if (!config.azureOpenAI?.endpoint || !config.azureOpenAI?.apiKey) {
            console.error('Missing OpenAI configuration:', {
                hasEndpoint: !!config.azureOpenAI?.endpoint,
                hasApiKey: !!config.azureOpenAI?.apiKey
            });
            throw new Error('Azure OpenAI credentials not properly configured');
        }

        this.client = new OpenAIClient(
            config.azureOpenAI.endpoint,
            new AzureKeyCredential(config.azureOpenAI.apiKey)
        );

        // Initialize Search client
        if (!config.azureSearch?.endpoint || !config.azureSearch?.indexName || !config.azureSearch?.apiKey) {
            console.error('Missing Search configuration:', {
                hasEndpoint: !!config.azureSearch?.endpoint,
                hasIndexName: !!config.azureSearch?.indexName,
                hasApiKey: !!config.azureSearch?.apiKey
            });
            throw new Error('Azure Cognitive Search credentials not properly configured');
        }

        this.searchClient = new SearchClient<SearchDocument>(
            config.azureSearch.endpoint,
            config.azureSearch.indexName,
            new SearchKeyCredential(config.azureSearch.apiKey)
        );

        this.onMessage(async (context: TurnContext) => {
            await this.handleIncomingMessage(context);
        });

        this.onMembersAdded(async (context: TurnContext) => {
            await this.handleMembersAdded(context);
        });
    }

    private async handleIncomingMessage(context: TurnContext): Promise<void> {
        const userMessage = context.activity.text || '';

        try {
            // Search for relevant documents
            const searchResults = await this.searchClient.search(userMessage, {
                queryType: 'simple',
                select: ['content'],
                top: 5,
                searchFields: ['content']
            });

            let contextText = '';
            for await (const result of searchResults.results) {
                if (result.document.content) {
                    contextText += result.document.content + '\n';
                }
            }

            const messages: ChatRequestMessage[] = [
                {
                    role: "system",
                    content: `You are a helpful AI assistant integrated into Microsoft Teams. Your role is to help users by providing accurate and relevant information.
                    
If you find relevant information in the provided context, use it to inform your response. If you don't find relevant information in the context, you can still provide a helpful response based on your general knowledge.

Always maintain a professional and friendly tone, and format your responses in a clear and readable way.

When dealing with technical information:
- Provide clear explanations
- Use examples when helpful
- Break down complex concepts
- Highlight important points
- Include relevant caveats or limitations

If you're not sure about something, be honest about your limitations and suggest alternative resources or approaches.`
                },
                {
                    role: "user",
                    content: `Context from knowledge base:\n${contextText}\n\nUser Question: ${userMessage}`
                }
            ];

            const deploymentName = config.azureOpenAI?.deploymentName;
            if (!deploymentName) {
                throw new Error('Azure OpenAI deployment name not configured');
            }

            const response = await this.client.getChatCompletions(
                deploymentName,
                messages,
                {
                    maxTokens: 800,
                    temperature: 0.7,
                    topP: 0.95,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                }
            );

            if (response.choices && response.choices.length > 0) {
                const messageContent = response.choices[0].message?.content;
                if (messageContent) {
                    const formattedResponse = this.formatResponseForTeams(messageContent);
                    await context.sendActivity(formattedResponse);
                    await this.logConversation(context, formattedResponse);
                } else {
                    await context.sendActivity("I'm sorry, I couldn't generate a response.");
                }
            } else {
                await context.sendActivity("I'm sorry, I couldn't generate a response.");
            }
        } catch (err: unknown) {
            console.error('Error in TeamsBot:', err);
            
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Detailed error:', errorMessage);
            
            if (err instanceof Error && err.stack) {
                console.error('Error stack:', err.stack);
            }

            await context.sendActivity(
                "I'm sorry, I encountered an error while processing your message. " +
                "Please try again or contact support if the issue persists."
            );
        }
    }

    private formatResponseForTeams(response: string): string {
        let formattedResponse = response;

        // Format code blocks
        formattedResponse = formattedResponse.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (_, language, code) => {
            return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
        });

        // Format bullet points
        formattedResponse = formattedResponse.replace(/^\s*[-*]\s/gm, '\n• ');

        // Format numbered lists
        formattedResponse = formattedResponse.replace(/^\s*(\d+\.)\s/gm, '\n$1 ');

        // Format headers
        formattedResponse = formattedResponse.replace(/^(#{1,6})\s(.+)$/gm, '\n$1 $2\n');

        // Clean up excessive newlines
        formattedResponse = formattedResponse.replace(/\n{3,}/g, '\n\n');

        return formattedResponse.trim();
    }

    private async handleMembersAdded(context: TurnContext): Promise<void> {
        const membersAdded = context.activity.membersAdded;
        const welcomeText = `👋 Hello! I'm your AI assistant integrated with Microsoft Teams. I can help you with:

• Answering questions about our documentation and knowledge base
• Providing explanations and clarifications
• Offering technical assistance and guidance

Feel free to ask me anything! How can I help you today?`;
        
        for (const member of membersAdded || []) {
            if (member.id !== context.activity.recipient.id) {
                await context.sendActivity(welcomeText);
            }
        }
    }

    private checkMessageType(context: TurnContext): 'direct' | 'channel' | 'unknown' {
        const activity = context.activity;
        
        if (activity.conversation.conversationType === 'personal') {
            return 'direct';
        } else if (activity.conversation.conversationType === 'channel') {
            return 'channel';
        }
        
        return 'unknown';
    }

    private isUserMessage(context: TurnContext): boolean {
        return context.activity.type === 'message' && !!context.activity.text;
    }

    private async logConversation(context: TurnContext, responseText: string): Promise<void> {
        try {
            const timestamp = new Date().toISOString();
            const userMessage = context.activity.text || '';
            const userId = context.activity.from.id;
            const conversationType = this.checkMessageType(context);

            console.log({
                timestamp,
                userId,
                conversationType,
                userMessage,
                botResponse: responseText,
            });
        } catch (err: unknown) {
            console.error('Error logging conversation:', err instanceof Error ? err.message : err);
        }
    }
}