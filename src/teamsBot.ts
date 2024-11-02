import {
    TeamsActivityHandler,
    TurnContext,
    ActivityTypes,
    ConversationReference,
    SigninStateVerificationQuery,
    MessageFactory
} from 'botbuilder';
import { OpenAIService } from './services/OpenAIService';
import { StorageService } from './services/StorageService';
import { SearchService } from './services/SearchService';
import { FileHandler } from './handlers/FileHandler';
import { MessageHandler } from './handlers/MessageHandler';
import { ChatMessage } from './types/ChatTypes';
import { ConversationState } from './types/FileTypes';

export class TeamsBot extends TeamsActivityHandler {
    private openAIService: OpenAIService;
    private fileHandler: FileHandler;
    private messageHandler: MessageHandler;
    private conversationStates: Map<string, ConversationState>;
    private readonly CONTEXT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    constructor(
        openAIService: OpenAIService,
        storageService: StorageService,
        searchService: SearchService
    ) {
        super();
        this.openAIService = openAIService;
        this.fileHandler = new FileHandler(storageService);
        this.messageHandler = new MessageHandler(searchService, openAIService);
        this.conversationStates = new Map<string, ConversationState>();

        // Add welcome message handler
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded || [];
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    const welcomeMessage = MessageFactory.text(
                        "Welcome to the Document Analysis Bot! 👋\n\n" +
                        "Here's what I can do:\n" +
                        "📄 Process uploaded documents and answer questions about them\n" +
                        "💬 Answer general questions and maintain conversation context\n" +
                        "🔄 Remember our conversation history for more contextual responses\n\n" +
                        "To get started:\n" +
                        "1. Upload a document to analyze it\n" +
                        "2. Ask questions about the document\n" +
                        "3. Or simply chat with me about any topic!\n\n" +
                        "How can I help you today?"
                    );
                    await context.sendActivity(welcomeMessage);
                }
            }
            await next();
        });

        this.onMessage(async (context, next) => {
            await this.handleMessage(context);
            await next();
        });
    }

    private async handleMessage(context: TurnContext): Promise<void> {
        try {
            const conversationId = this.getConversationId(context);
            let state = this.getConversationState(conversationId);

            // Handle file uploads
            if (context.activity.attachments && context.activity.attachments.length > 0) {
                await this.processFileUpload(context, state);
                return;
            }

            // Get message history
            const history = this.getMessageHistory(state, context);

            // Handle text messages
            if (context.activity.type === ActivityTypes.Message) {
                await this.messageHandler.handleMessage(context, history);
            }

            // Update conversation state
            this.updateConversationState(conversationId, state);

        } catch (error) {
            console.error('Error in handleMessage:', error);
            await context.sendActivity('Sorry, I encountered an error processing your message.');
        }
    }

    private async processFileUpload(context: TurnContext, state: ConversationState): Promise<void> {
        try {
            const results = await this.fileHandler.handleFileUpload(context);
            
            if (results?.length) {
                results.forEach((result) => {
                    if (result.success && result.content) {
                        state.documents[result.documentId] = {
                            content: result.content,
                            metadata: result.metadata
                        };
                    }
                });

                state.documentContext = true;
                state.lastQuestionTimestamp = Date.now();
                state.contextExpiryTime = Date.now() + this.CONTEXT_TIMEOUT;
                state.processedFiles = results;

                const fileNames = results
                    .filter(r => r.success)
                    .map(r => r.metadata.fileName)
                    .join(', ');

                await context.sendActivity(
                    `✅ Successfully processed ${results.length} file(s): ${fileNames}\n\nYou can now ask questions about the content.`
                );
            } else {
                await context.sendActivity("❌ No files could be processed. Please try again.");
            }
        } catch (error) {
            console.error('Error processing file upload:', error);
            await context.sendActivity('Sorry, there was an error processing your file(s).');
        }
    }

    private getConversationId(context: TurnContext): string {
        const conversationReference = TurnContext.getConversationReference(context.activity);
        return `${conversationReference.conversation?.id}-${conversationReference.channelId}`;
    }

    private getConversationState(conversationId: string): ConversationState {
        let state = this.conversationStates.get(conversationId);
        if (!state || this.isContextExpired(state)) {
            state = this.initializeConversationState();
            this.conversationStates.set(conversationId, state);
        }
        return state;
    }

    private initializeConversationState(): ConversationState {
        return {
            documents: {},
            documentContext: false,
            lastQuestionTimestamp: undefined,
            contextExpiryTime: undefined,
            processedFiles: [],
            messageHistory: [] // Add this if you want to maintain chat history
        };
    }

    private isContextExpired(state: ConversationState): boolean {
        return state.contextExpiryTime !== undefined && Date.now() > state.contextExpiryTime;
    }

    private getMessageHistory(state: ConversationState, context: TurnContext): ChatMessage[] {
        const history: ChatMessage[] = [];
        
        // Always add a system message defining the bot's role
        history.push({
            role: 'system',
            content: 'You are a helpful AI assistant that answers questions clearly and concisely.'
        });

        // Add document context if available
        if (state.documentContext && state.processedFiles?.length) {
            const contextMessage: ChatMessage = {
                role: 'system',
                content: `You are analyzing these documents:\n${state.processedFiles
                    .filter(f => f.success)
                    .map(f => `File: ${f.metadata.fileName}\n${f.content}\n`)
                    .join('\n')}`
            };
            history.push(contextMessage);
        }

        // Add chat history if available
        if (state.messageHistory && state.messageHistory.length > 0) {
            history.push(...state.messageHistory);
        }

        // If no user message in history, add current message
        if (!history.some(msg => msg.role === 'user')) {
            history.push({
                role: 'user',
                content: context.activity.text || ''
            });
        }

        return history;
    }

    private updateConversationState(conversationId: string, state: ConversationState): void {
        this.conversationStates.set(conversationId, state);
    }

    // Override this method to handle Teams-specific functionality if needed
    protected async handleTeamsSigninVerifyState(context: TurnContext, query: SigninStateVerificationQuery): Promise<void> {
        await super.handleTeamsSigninVerifyState(context, query);
    }

    // Method to run the bot
    public async run(context: TurnContext): Promise<void> {
        await super.run(context);
    }
}
