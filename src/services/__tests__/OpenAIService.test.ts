import { OpenAIService } from '../../services/OpenAIService';
import { ChatMessage, VisionRequestMessage } from '../../types/ChatTypes';

describe('OpenAIService Live Tests', () => {
    let service: OpenAIService;

    // Simple 1x1 red pixel PNG
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    beforeAll(() => {
        service = new OpenAIService();
    });

    describe('Chat Completions', () => {
        it('should get chat completion response', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Say hello' }
            ];

            const result = await service.getChatCompletion(messages);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should handle streaming completions', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Count from 1 to 3' }
            ];

            let streamedResponse = '';
            await service.getStreamingCompletion(messages, async (chunk) => {
                streamedResponse += chunk;
            });

            expect(streamedResponse).toBeTruthy();
            expect(streamedResponse.length).toBeGreaterThan(0);
        });

        it('should handle multiple messages in conversation', async () => {
            const messages: ChatMessage[] = [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'What is 2+2?' },
                { role: 'assistant', content: '4' },
                { role: 'user', content: 'Now multiply that by 2' }
            ];

            const result = await service.getChatCompletion(messages);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });
    });

    describe('Vision Completions', () => {
        it('should detect colors in images', async () => {
            const messages: VisionRequestMessage[] = [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'What is the primary color of this image?'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${testImageBase64}`
                            }
                        }
                    ]
                }
            ];

            const result = await service.getVisionCompletion(messages);
            expect(result.toLowerCase()).toContain('red');
        }, 30000);

        it('should handle multiple vision requests', async () => {
            const messages: VisionRequestMessage[] = [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'What is the primary color of this image?'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/png;base64,${testImageBase64}`
                            }
                        }
                    ]
                }
            ];

            const result1 = await service.getVisionCompletion(messages);
            const result2 = await service.getVisionCompletion(messages);

            expect(result1.toLowerCase()).toContain('red');
            expect(result2.toLowerCase()).toContain('red');
        }, 60000);

        it('should handle invalid vision messages', async () => {
            const invalidMessages = [{
                role: 'user',
                content: 'This should be an array of MessageContent'
            }] as unknown as VisionRequestMessage[];

            await expect(service.getVisionCompletion(invalidMessages))
                .rejects
                .toThrow('Vision Completion failed: No valid vision request message found');
        });
    });

    describe('Error Handling', () => {
        it('should handle rate limiting gracefully', async () => {
            const messages: ChatMessage[] = [
                { role: 'user', content: 'Test message' }
            ];

            const promises = Array(3).fill(null).map(() => 
                service.getChatCompletion(messages)
            );

            const results = await Promise.allSettled(promises);
            expect(results.some(r => r.status === 'fulfilled')).toBe(true);
        });

        it('should handle long inputs appropriately', async () => {
            const longText = 'test '.repeat(100);
            const messages: ChatMessage[] = [
                { role: 'user', content: longText }
            ];

            const result = await service.getChatCompletion(messages);
            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });
    });
});
