import {
    TeamsActivityHandler,
    TurnContext,
    ActivityTypes,
    ConversationReference,
    MessageFactory,
    CardFactory
} from 'botbuilder';
import { OpenAIService } from './services/OpenAIService';
import { StorageService } from './services/StorageService';
import { SearchService } from './services/SearchService';
import { FileHandler } from './handlers/FileHandler';
import { MessageHandler } from './handlers/MessageHandler';
import { ChatMessage } from './types/ChatTypes';
import * as winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

interface ConversationState {
    documents: { [key: string]: any };
    documentContext: boolean;
    lastQuestionTimestamp: number;
    contextExpiryTime: number;
    processedFiles: any[];
    messageHistory: ChatMessage[];
    feedbackPrompted: boolean;
}

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
    }

    public async run(context: TurnContext): Promise<void> {
        try {
            await super.run(context);
            
            const conversationId = context.activity.conversation.id;
            const state = this.getConversationState(conversationId);

            if (context.activity.type === ActivityTypes.Message) {
                const text = context.activity.text?.trim() || '';
                
                if (text.startsWith('aHR0cHM6Ly9ncHRz')) {
                    await this.handleDocumentSelection(context, text);
                } else {
                    await this.handleMessage(context);
                }
            }
        } catch (error) {
            logger.error('Error in onTurn:', error);
            await context.sendActivity('Sorry, I encountered an error.');
        }
    }

    private getConversationState(conversationId: string): ConversationState {
        let state = this.conversationStates.get(conversationId);
        if (!state) {
            state = {
                documents: {},
                documentContext: false,
                lastQuestionTimestamp: Date.now(),
                contextExpiryTime: Date.now() + this.CONTEXT_TIMEOUT,
                processedFiles: [],
                messageHistory: [],
                feedbackPrompted: false
            };
            this.conversationStates.set(conversationId, state);
        }
        return state;
    }

    private async handleMessage(context: TurnContext): Promise<void> {
        try {
            const conversationId = context.activity.conversation.id;
            let state = this.getConversationState(conversationId);

            if ((context.activity.attachments?.length ?? 0) > 0) {
                await this.fileHandler.handleFileUpload(context);
                return;
            }

            if (context.activity.type === ActivityTypes.Message) {
                await this.messageHandler.handleMessage(context);
            }

            this.conversationStates.set(conversationId, state);
        } catch (error) {
            logger.error('Error in handleMessage:', error);
            await context.sendActivity('Sorry, I encountered an error processing your message.');
        }
    }

    private async handleDocumentSelection(context: TurnContext, documentId: string): Promise<void> {
        try {
            const document = await this.messageHandler.getDocumentContent(documentId);
            if (document) {
                // Log the raw document content
                logger.info('Raw Document Content:', document.content);

                const formattedContent = this.formatDocumentContent(document.content);
                
                // Log the formatted content to the terminal and file
                logger.info('Formatted Content:', JSON.stringify(formattedContent, null, 2));
                
                // Send formatted text first
                await context.sendActivity(MessageFactory.text(formattedContent));
                
                // Then send images as cards
                const imageUrls = this.extractImageUrls(document.content);
                for (const imageUrl of imageUrls) {
                    const card = CardFactory.heroCard(
                        '',
                        [imageUrl],
                        [],
                        { text: '' }
                    );
                    await context.sendActivity({ attachments: [card] });
                }
            } else {
                await context.sendActivity("Sorry, I couldn't retrieve that document.");
            }
        } catch (error) {
            logger.error('Error handling document selection:', error);
            await context.sendActivity('Sorry, there was an error retrieving the document.');
        }
    }

    private extractImageUrls(content: string): string[] {
        const imageUrls: string[] = [];
        const regex = /!\[.*?\]\((.*?)\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            imageUrls.push(match[1]);
        }
        return imageUrls;
    }

    private getSourceUrl(content: string): string | null {
        const regex = /Source URL:\s*(https?:\/\/[^\s]+)/;
        const match = content.match(regex);
        return match ? match[1] : null;
    }

    private formatDocumentContent(content: string): string {
        const sourceUrl = this.getSourceUrl(content);
        let formattedContent = '';
        
        if (sourceUrl) {
            formattedContent += `📄 Source Document: ${sourceUrl}\n\n`;
        }

        formattedContent += content
            // Remove image markdown to handle separately
            .replace(/!\[(.*?)\]\(.*?\)/g, '')
            
            // Format section headers
            .replace(/([^\n]+?)\s*={3,}/g, '\n\n## $1\n\n')
            
            // Format lists
            .replace(/^\s*(\d+)\.\s*(.+)/gm, '\n$1. $2')
            .replace(/^\s*[•*]\s*(.+)/gm, '\n• $1')
            .replace(/([a-z])\)\s+(.+)/g, '   • $2')
            
            // Format API endpoints
            .replace(/(\/[A-Za-z_]+\/[A-Za-z0-9\/.]+)/g, '\n```\n$1\n```\n')
            
            // Clean up whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return formattedContent;
    }
}