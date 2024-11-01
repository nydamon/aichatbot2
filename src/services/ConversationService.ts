import { ChatMessage } from '../types/ChatTypes';
import { IConversationManager } from '../interfaces/IConversationManager';

export class ConversationService implements IConversationManager {
    private conversations: Map<string, ChatMessage[]>;
    private readonly MAX_HISTORY_LENGTH = 10;

    constructor() {
        this.conversations = new Map<string, ChatMessage[]>();
    }

    getHistory(conversationId: string): ChatMessage[] {
        return this.conversations.get(conversationId) || [];
    }

    addMessage(conversationId: string, message: ChatMessage): void {
        const history = this.getHistory(conversationId);
        history.push(message);

        if (history.length > this.MAX_HISTORY_LENGTH) {
            history.shift();
        }

        this.conversations.set(conversationId, history);
    }

    clearHistory(conversationId: string): void {
        this.conversations.delete(conversationId);
    }

    hasRecentFileUpload(conversationId: string): boolean {
        const history = this.getHistory(conversationId);
        return history.some(msg => 
            msg.role === "system" && 
            msg.content.includes("User uploaded file")
        );
    }
}
