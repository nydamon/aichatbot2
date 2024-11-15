import { ConversationService } from '../ConversationService';
import { ChatMessage } from '../../types/ChatTypes';
import fs from 'fs';
import path from 'path';

describe('ConversationService Tests', () => {
    let service: ConversationService;
    const testConversationId = 'test-conversation-123';

    beforeEach(() => {
        service = new ConversationService();
    });

    describe('Message History Management', () => {
        it('should start with empty history for new conversation', () => {
            const history = service.getHistory(testConversationId);
            expect(history).toEqual([]);
        });

        it('should add and retrieve messages correctly', () => {
            const message: ChatMessage = {
                role: 'user',
                content: 'Hello, world!'
            };

            service.addMessage(testConversationId, message);
            const history = service.getHistory(testConversationId);

            expect(history).toHaveLength(1);
            expect(history[0]).toEqual(message);
        });

        it('should maintain message order', () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'First message' },
                { role: 'assistant', content: 'Second message' },
                { role: 'user', content: 'Third message' }
            ];

            messages.forEach(msg => service.addMessage(testConversationId, msg));
            const history = service.getHistory(testConversationId);

            expect(history).toHaveLength(3);
            expect(history).toEqual(messages);
        });

        it('should enforce maximum history length', () => {
            // Add more messages than MAX_HISTORY_LENGTH (10)
            for (let i = 0; i < 12; i++) {
                service.addMessage(testConversationId, {
                    role: 'user',
                    content: `Message ${i}`
                });
            }

            const history = service.getHistory(testConversationId);
            expect(history).toHaveLength(10);
            expect(history[0].content).toBe('Message 2'); // First two messages should be removed
            expect(history[9].content).toBe('Message 11');
        });
    });

    describe('History Management', () => {
        it('should clear history correctly', () => {
            service.addMessage(testConversationId, {
                role: 'user',
                content: 'Test message'
            });

            service.clearHistory(testConversationId);
            const history = service.getHistory(testConversationId);
            expect(history).toEqual([]);
        });

        it('should handle clearing non-existent conversation', () => {
            expect(() => service.clearHistory('non-existent-id')).not.toThrow();
        });

        it('should handle multiple conversations independently', () => {
            const conversationId1 = 'conversation-1';
            const conversationId2 = 'conversation-2';

            service.addMessage(conversationId1, {
                role: 'user',
                content: 'Message for conversation 1'
            });

            service.addMessage(conversationId2, {
                role: 'user',
                content: 'Message for conversation 2'
            });

            expect(service.getHistory(conversationId1)[0].content).toBe('Message for conversation 1');
            expect(service.getHistory(conversationId2)[0].content).toBe('Message for conversation 2');
        });
    });

    describe('File Upload Detection', () => {
        it('should detect recent file upload', () => {
            service.addMessage(testConversationId, {
                role: 'system',
                content: 'User uploaded file: test.pdf'
            });

            expect(service.hasRecentFileUpload(testConversationId)).toBe(true);
        });

        it('should return false when no file upload exists', () => {
            service.addMessage(testConversationId, {
                role: 'user',
                content: 'Regular message'
            });

            expect(service.hasRecentFileUpload(testConversationId)).toBe(false);
        });

        it('should handle empty history for file upload check', () => {
            expect(service.hasRecentFileUpload('non-existent-id')).toBe(false);
        });
    });

    afterAll(() => {
        // Add conversation-related constants to our validated constants file
        const constantsPath = path.join(__dirname, '..', '..', 'constants', 'validated-endpoints.ts');
        const existingContent = fs.readFileSync(constantsPath, 'utf8');
        
        // Find the last closing brace
        const lastBraceIndex = existingContent.lastIndexOf('}');
        
        // Insert conversation constants
        const newContent = existingContent.slice(0, lastBraceIndex) + `,
    CONVERSATION: {
        MAX_HISTORY_LENGTH: 10,
        ROLES: {
            SYSTEM: 'system' as const,
            USER: 'user' as const,
            ASSISTANT: 'assistant' as const
        }
    }
} as const;`;

        fs.writeFileSync(constantsPath, newContent);
    });
});
