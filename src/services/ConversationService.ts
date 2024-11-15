import { ChatMessage, isMessageContentArray } from '../types/ChatTypes';
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
        return history.some(msg => {
            if (msg.role === "system") {
                const content = isMessageContentArray(msg.content) 
                    ? msg.content.find(c => c.type === 'text')?.text || ''
                    : msg.content;
                return content.includes("User uploaded file");
            }
            return false;
        });
    }
}
