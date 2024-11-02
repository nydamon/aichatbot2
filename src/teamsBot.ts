import { 
    TeamsActivityHandler, 
    TurnContext 
} from "botbuilder";
import { OpenAIService } from "./services/OpenAIService";
import { SearchService } from "./services/SearchService";
import { StorageService } from "./services/StorageService";
import { FileHandler } from "./handlers/FileHandler";
import { DocumentMetadata, FileUploadResult } from "./interfaces/IFileHandler";

interface ConversationState {
    lastDocumentId?: string;
    lastDocumentContent?: string;
    documentMetadata?: DocumentMetadata;
    documentContext?: boolean;
    lastQuestionTimestamp?: number;
    contextExpiryTime?: number;
}

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export class TeamsBot extends TeamsActivityHandler {
    private conversationStates: Map<string, ConversationState>;
    private readonly CONTEXT_TIMEOUT: number;
    private readonly RELEVANT_KEYWORDS: string[];
    private fileHandler: FileHandler;
    private openAIService: OpenAIService;

    constructor(
        openAIService: OpenAIService,
        searchService: SearchService,
        storageService: StorageService
    ) {
        super();
        this.openAIService = openAIService;
        this.fileHandler = new FileHandler(openAIService, storageService, searchService);
        this.conversationStates = new Map<string, ConversationState>();
        this.CONTEXT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        this.RELEVANT_KEYWORDS = ["document", "file", "pdf", "content", "it", "this"];

        // Handle members added to the conversation
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded || [];
            const welcomeText = `Hello! I'm your AI assistant. I can help you with:
            • Analyzing documents you upload
            • Answering questions about uploaded documents
            • General questions and assistance
            
Just upload a document or ask me a question to get started!`;

            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(welcomeText);
                }
            }
            await next();
        });

        // Handle messages
        this.onMessage(async (context, next) => {
            await this.handleMessage(context);
            await next();
        });
    }

    private async handleMessage(context: TurnContext): Promise<void> {
        const conversationId = context.activity.conversation.id;
        let state = this.getOrCreateConversationState(conversationId);

        try {
            if ((context.activity.attachments ?? []).length > 0) {
                await this.processFileUpload(context, state);
                return;
            }

            const userMessage = context.activity.text;
            if (!userMessage) return;

            if (this.checkContextExpired(state)) {
                state.documentContext = false;
                state.lastDocumentContent = undefined;
            }

            if (state.documentContext && state.lastDocumentContent) {
                await this.processMessageWithContext(userMessage, state, context);
            } else {
                await this.handleGeneralQuery(userMessage, context);
            }

        } catch (error) {
            console.error('Error in message handling:', error);
            await context.sendActivity('I encountered an error processing your request.');
        } finally {
            this.setConversationState(conversationId, state);
            this.performContextCleanup();
        }
    }

    private getOrCreateConversationState(conversationId: string): ConversationState {
        let state = this.conversationStates.get(conversationId);
        if (!state) {
            state = {
                contextExpiryTime: Date.now() + this.CONTEXT_TIMEOUT
            };
            this.conversationStates.set(conversationId, state);
        }
        return state;
    }

    private async processFileUpload(context: TurnContext, state: ConversationState): Promise<void> {
        try {
            const result = await this.fileHandler.handleFileUpload(context);
            if (result && 'documentId' in result) {
                const fileResult = result as FileUploadResult;
                state.lastDocumentId = fileResult.documentId;
                state.lastDocumentContent = fileResult.content;
                state.documentContext = true;
                state.documentMetadata = fileResult.metadata;
                state.lastQuestionTimestamp = Date.now();
                state.contextExpiryTime = Date.now() + this.CONTEXT_TIMEOUT;
                
                await context.sendActivity('Document processed successfully. You can now ask questions about its content.');
            }
        } catch (error) {
            console.error('Error handling file upload:', error);
            await context.sendActivity('There was an error processing your file.');
        }
    }

    private async processMessageWithContext(
        userMessage: string, 
        state: ConversationState, 
        context: TurnContext
    ): Promise<void> {
        if (!state.lastDocumentContent) return;

        const isDocumentQuestion = await this.isDocumentRelatedQuestion(
            userMessage,
            state.lastDocumentContent,
            state.documentMetadata
        );

        if (isDocumentQuestion) {
            const response = await this.handleDocumentQuery(
                userMessage,
                state.lastDocumentContent,
                state.documentMetadata
            );
            await context.sendActivity(response);
        } else {
            await this.handleGeneralQuery(userMessage, context);
        }
        
        state.lastQuestionTimestamp = Date.now();
    }

    private async isDocumentRelatedQuestion(
        question: string,
        documentContent: string,
        metadata?: DocumentMetadata
    ): Promise<boolean> {
        const hasKeywords = this.RELEVANT_KEYWORDS.some(keyword => 
            question.toLowerCase().includes(keyword.toLowerCase())
        );

        if (hasKeywords) return true;

        const messages = this.getTextClassificationPrompt(documentContent, question, metadata);
        const response = await this.openAIService.getChatCompletion(messages);
        return response.toLowerCase().includes('true');
    }

    private async handleDocumentQuery(
        question: string,
        documentContent: string,
        metadata?: DocumentMetadata
    ): Promise<string> {
        const messages = this.getDocumentQueryPrompt(documentContent, question, metadata);
        return await this.openAIService.getChatCompletion(messages);
    }

    private async handleGeneralQuery(question: string, context: TurnContext): Promise<void> {
        const messages: ChatMessage[] = [{
            role: "system",
            content: "You are a helpful AI assistant answering general questions."
        }, {
            role: "user",
            content: question
        }];

        const response = await this.openAIService.getChatCompletion(messages);
        await context.sendActivity(response);
    }

    private checkContextExpired(state: ConversationState): boolean {
        if (!state.lastQuestionTimestamp || !state.contextExpiryTime) {
            return true;
        }
        return Date.now() > state.contextExpiryTime;
    }

    private setConversationState(conversationId: string, state: ConversationState): void {
        this.conversationStates.set(conversationId, state);
    }

    private performContextCleanup(): void {
        for (const [conversationId, state] of this.conversationStates.entries()) {
            if (this.checkContextExpired(state)) {
                this.conversationStates.delete(conversationId);
            }
        }
    }

    private getTextClassificationPrompt(
        documentContent: string,
        question: string,
        metadata?: DocumentMetadata
    ): ChatMessage[] {
        return [
            {
                role: "system",
                content: "Determine if the user's question is about the provided document content. Consider context and implicit references. Respond with 'true' or 'false' only."
            },
            {
                role: "user",
                content: `Document content: ${documentContent.substring(0, 1000)}...
                         ${metadata ? `\nDocument metadata: ${JSON.stringify(metadata)}` : ''}
                         \nQuestion: ${question}
                         \nIs this question about the document content?`
            }
        ];
    }

    private getDocumentQueryPrompt(
        documentContent: string,
        question: string,
        metadata?: DocumentMetadata
    ): ChatMessage[] {
        return [
            {
                role: "system",
                content: `You are an AI assistant answering questions about a specific document.
                         ${metadata ? `Document type: ${metadata.fileType}
                         Document name: ${metadata.fileName}` : ''}
                         Use only the provided document content to answer questions.
                         If you can't find the answer in the document, say so clearly.`
            },
            {
                role: "user",
                content: `Document content: ${documentContent}\n\nQuestion: ${question}`
            }
        ];
    }
}
