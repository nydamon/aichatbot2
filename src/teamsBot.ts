import { ActivityHandler, TurnContext } from 'botbuilder';
import { OpenAIService } from './services/OpenAIService';
import { SearchService } from './services/SearchService';
import { StorageService } from './services/StorageService';
import { MessageHandler } from './handlers/MessageHandler';
import { FileHandler } from './handlers/FileHandler';
import { CommandHandler } from './handlers/CommandHandler';
import { ConversationService } from './services/ConversationService';

export class TeamsBot extends ActivityHandler {
    private messageHandler: MessageHandler;
    private fileHandler: FileHandler;
    private commandHandler: CommandHandler;
    private conversationService: ConversationService;

    constructor(
        openAIService: OpenAIService,
        searchService: SearchService,
        storageService: StorageService
    ) {
        super();

        // Initialize conversation service
        this.conversationService = new ConversationService();

        // Initialize handlers with dependencies
        this.messageHandler = new MessageHandler(openAIService, this.conversationService);
        this.fileHandler = new FileHandler(openAIService, storageService);
        this.commandHandler = new CommandHandler(this.conversationService, searchService);

        this.setupHandlers();
    }

    private setupHandlers(): void {
        this.onMessage(async (context: TurnContext) => {
            try {
                await context.sendActivity({ type: 'typing' });

                if (context.activity.attachments && context.activity.attachments.length > 0) {
                    await this.fileHandler.handleFileUpload(context);
                } else if (context.activity.text?.startsWith('/')) {
                    await this.commandHandler.handleCommand(context, context.activity.text);
                } else {
                    await this.messageHandler.handleMessage(context);
                }
            } catch (error) {
                console.error('Error in message handler:', error);
                await context.sendActivity('I encountered an error processing your request.');
            }
        });

        this.onMembersAdded(async (context: TurnContext) => {
            const welcomeText = `👋 Hello! I'm your AI assistant for Teams. I can help you with:
            - Analyzing uploaded files
            - Answering questions
            - Processing commands

            Type /help to see available commands.`;

            for (const member of context.activity.membersAdded || []) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(welcomeText);
                }
            }
        });
    }
}
