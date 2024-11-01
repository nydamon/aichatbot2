import { ChatMessage } from '../types/ChatTypes';

export interface IConversationManager {
    getHistory(conversationId: string): ChatMessage[];
    addMessage(conversationId: string, message: ChatMessage): void;
    clearHistory(conversationId: string): void;
    hasRecentFileUpload(conversationId: string): boolean;
}
