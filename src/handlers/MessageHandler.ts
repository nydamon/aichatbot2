import { TurnContext } from 'botbuilder';
import { IMessageHandler } from '../interfaces/IMessageHandler';
import { OpenAIService } from '../services/OpenAIService';
import { ConversationService } from '../services/ConversationService';
import { ChatMessage } from '../types/ChatTypes';

export class MessageHandler implements IMessageHandler {
    private openAIService: OpenAIService;
    private conversationService: ConversationService;

    constructor(
        openAIService: OpenAIService,
        conversationService: ConversationService
    ) {
        this.openAIService = openAIService;
        this.conversationService = conversationService;
    }

    async handleMessage(context: TurnContext): Promise<void> {
        const message = context.activity.text?.trim();
        if (!message) return;

        try {
            const conversationId = context.activity.conversation.id;
            const history = this.conversationService.getHistory(conversationId);

            if (this.conversationService.hasRecentFileUpload(conversationId)) {
                await this.handleFileQuery(context, history);
            } else {
                await this.handleGeneralQuery(context, history);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            await context.sendActivity('I encountered an error processing your request.');
        }
    }

    async handleGeneralQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const query = context.activity.text;
        if (!query) return;

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "You are a helpful AI assistant in Microsoft Teams."
            },
            ...history,
            {
                role: "user",
                content: query
            }
        ];

        try {
            const response = await this.openAIService.getChatCompletion(messages);
            await context.sendActivity(response);

            if (response) {
                this.conversationService.addMessage(context.activity.conversation.id, {
                    role: "assistant",
                    content: response
                });
            }
        } catch (error) {
            console.error('Error in general query:', error);
            await context.sendActivity('I encountered an error processing your request.');
        }
    }

    async handleFileQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const query = context.activity.text;
        if (!query) return;

        const messages: ChatMessage[] = [
            {
                role: "system",
                content: "You are an AI assistant analyzing a file. Provide specific answers based on the file content."
            },
            ...history,
            {
                role: "user",
                content: query
            }
        ];

        try {
            const response = await this.openAIService.getChatCompletion(messages);
            await context.sendActivity(response);
        } catch (error) {
            console.error('Error in file query:', error);
            await context.sendActivity('I encountered an error analyzing the file.');
        }
    }
}
