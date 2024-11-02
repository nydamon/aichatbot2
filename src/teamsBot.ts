import { 
    TeamsActivityHandler, 
    TurnContext, 
    MessageFactory 
} from "botbuilder";
import { OpenAIService } from "./services/OpenAIService";
import { StorageService } from "./services/StorageService";
import { FileHandler } from "./handlers/FileHandler"; 
import { ConversationState, FileUploadResult } from "./types/FileTypes"; 
import { ChatMessage } from "./types/ChatTypes";

export class TeamsBot extends TeamsActivityHandler {
    private conversationStates: Map<string, ConversationState>;
    private readonly CONTEXT_TIMEOUT: number = 30 * 60 * 1000; // 30 minutes
    private fileHandler: FileHandler;
    private openAIService: OpenAIService;

    constructor(
        openAIService: OpenAIService,
        storageService: StorageService
    ) {
        super();
        this.openAIService = openAIService;
        this.fileHandler = new FileHandler(storageService);
        this.conversationStates = new Map<string, ConversationState>();

        // Welcome message when members get added
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded || [];
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    const welcomeMessage = MessageFactory.text(
                        "Welcome to the Document Analysis Bot! 👋\n\n" +
                        "Upload documents and ask questions about them, or feel free to ask general queries!"
                    );
                    await context.sendActivity(welcomeMessage);
                }
            }
            await next();
        });

        // Handling user messages
        this.onMessage(async (context, next) => {
            await this.handleMessage(context);
            await next();
        });
    }

    // Get or create conversation state
    private getOrCreateConversationState(conversationId: string): ConversationState {
        let state = this.conversationStates.get(conversationId);
        if (!state) {
            state = {
                documents: {}, 
                documentContext: false
            };
            this.conversationStates.set(conversationId, state);
        }
        return state;
    }

    // Handle incoming user messages
    private async handleMessage(context: TurnContext): Promise<void> {
        const conversationId = context.activity.conversation.id;
        let state = this.getOrCreateConversationState(conversationId);

        try {
            // If a document (file) is uploaded
            if (context.activity.attachments?.length) {
                await this.processFileUpload(context, state);
                return;
            }

            const userMessage = context.activity.text;
            if (!userMessage) return;

            // Handle document-related context questions
            if (state.documentContext && state.documents) {
                await this.handleDocumentQuestion(userMessage, context, state);
            } else {
                // If no document context, handle general queries
                await this.handleGeneralQuery(userMessage, context);
            }
        } catch (error) {
            console.error("Error in handling user message:", error);
            await context.sendActivity("Sorry, something went wrong while processing your message.");
        }
    }

    // Process file attachments (document uploads)
    private async processFileUpload(context: TurnContext, state: ConversationState): Promise<void> {
        try {
            const results = await this.fileHandler.handleFileUpload(context);
            if (results?.length) {
                results.forEach((fileResult: FileUploadResult) => {
                    state.documents[fileResult.documentId] = {
                        content: fileResult.content || "",
                        metadata: fileResult.metadata
                    };
                });
                state.documentContext = true;
                state.lastQuestionTimestamp = Date.now();
                state.contextExpiryTime = Date.now() + this.CONTEXT_TIMEOUT;

                await context.sendActivity(`Processed ${results.length} file(s). You can now ask questions about their content.`);
            } else {
                await context.sendActivity("No files could be processed.");
            }
        } catch (error) {
            console.error("Error processing file upload:", error);
            await context.sendActivity("Sorry, there was an issue processing the uploaded file.");
        }
    }

    // Handle document-related questions
    private async handleDocumentQuestion(
        userMessage: string, 
        context: TurnContext, 
        state: ConversationState
    ): Promise<void> {
        // Gather context from uploaded documents
        if (!state.documents || Object.keys(state.documents).length === 0) {
            await context.sendActivity("No documents are currently loaded for reference.");
            return;
        }

        const documentsContext = Object.entries(state.documents)
            .map(([id, doc]) => `File: ${doc.metadata.fileName}\n${doc.content}`)
            .join("\n---\n");

        const messages: ChatMessage[] = [
            { role: "system", content: "You are an AI assistant analyzing documents." },
            { role: "user", content: `Documents:\n${documentsContext}\n\nUser Question: ${userMessage}` }
        ];

        try {
            const response = await this.openAIService.getChatCompletion(messages);
            await context.sendActivity(response);
        } catch (error) {
            console.error("Error with document-related chat completion:", error);
            await context.sendActivity("Sorry, there was an error answering your question.");
        }
    }

    // Handle general non-document-related queries
    private async handleGeneralQuery(userMessage: string, context: TurnContext): Promise<void> {
        const messages: ChatMessage[] = [
            { role: "system", content: "You are an AI assistant." },
            { role: "user", content: userMessage }
        ];

        try {
            const response = await this.openAIService.getChatCompletion(messages);
            await context.sendActivity(response);
        } catch (error) {
            console.error("Error with general query chat completion:", error);
            await context.sendActivity("Sorry, there was an error processing your query.");
        }
    }
}
