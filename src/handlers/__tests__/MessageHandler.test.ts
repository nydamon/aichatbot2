import { MessageHandler } from '../MessageHandler';
import { SearchService } from '../../services/SearchService';
import { OpenAIService } from '../../services/OpenAIService';
import { TurnContext, ConversationAccount, Activity, ActivityTypes } from 'botbuilder';

jest.mock('../../services/SearchService');
jest.mock('../../services/OpenAIService');

describe('MessageHandler', () => {
    let handler: MessageHandler;
    let mockSearchService: jest.Mocked<SearchService>;
    let mockOpenAIService: jest.Mocked<OpenAIService>;
    let mockContext: Partial<TurnContext>;
    let mockConversation: ConversationAccount;
    let mockActivity: Partial<Activity>;

    beforeEach(() => {
        mockSearchService = {
            searchDocuments: jest.fn(),
            getDocument: jest.fn()
        } as unknown as jest.Mocked<SearchService>;

        mockOpenAIService = {
            getChatCompletion: jest.fn(),
            getStreamingCompletion: jest.fn(),
            getEmbedding: jest.fn(),
            getFunctionCompletion: jest.fn()
        } as unknown as jest.Mocked<OpenAIService>;

        mockConversation = {
            id: 'test-conversation',
            name: 'Test Conversation',
            conversationType: 'personal',
            isGroup: false,
            tenantId: 'test-tenant'
        };

        mockActivity = {
            type: ActivityTypes.Message,
            id: '1234',
            timestamp: new Date(),
            localTimestamp: new Date(),
            channelId: 'test',
            from: { id: 'user1', name: 'Test User' },
            conversation: mockConversation,
            recipient: { id: 'bot', name: 'Test Bot' },
            serviceUrl: 'https://test.com',
            channelData: {},
            text: 'test message',
            localTimezone: 'UTC'
        };

        handler = new MessageHandler(mockSearchService, mockOpenAIService);

        mockContext = {
            activity: mockActivity as Activity,
            sendActivity: jest.fn().mockResolvedValue({ id: '1' })
        };

        // Setup streaming completion mock
        mockOpenAIService.getStreamingCompletion.mockImplementation(
            async (messages, callback) => {
                await callback('Test response');
                return;
            }
        );
    });

    describe('File Context Management', () => {
        it('should handle file context in messages', async () => {
            const conversationId = 'test-conversation';
            handler.addFileContext(conversationId, {
                fileName: 'test.xlsx',
                fileType: 'Excel',
                uploadTime: new Date(),
                content: 'Sample spreadsheet data'
            });

            mockActivity.text = 'how many rows?';
            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('AI assistant helping with document analysis')
                    }),
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('Regarding the Excel file')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should enhance questions about rows and columns', async () => {
            const conversationId = 'test-conversation';
            handler.addFileContext(conversationId, {
                fileName: 'data.csv',
                fileType: 'CSV',
                uploadTime: new Date()
            });

            mockActivity.text = 'what is in the first row?';
            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('CSV file named "data.csv"')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should clear file context with session', async () => {
            const conversationId = 'test-conversation';
            handler.addFileContext(conversationId, {
                fileName: 'test.xlsx',
                fileType: 'Excel',
                uploadTime: new Date()
            });

            handler.clearSessionDocuments(conversationId);

            mockActivity.text = 'how many rows?';
            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });
    });

    describe('Session Document Management', () => {
        it('should add document to session', async () => {
            const conversationId = 'test-conversation';
            handler.addDocumentToSession(conversationId, 'test content');
            handler.addFileContext(conversationId, {
                fileName: 'test.txt',
                fileType: 'Text',
                uploadTime: new Date(),
                content: 'test content'
            });
            
            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('test content')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should clear session documents', async () => {
            const conversationId = 'test-conversation';
            handler.addDocumentToSession(conversationId, 'test content');
            handler.clearSessionDocuments(conversationId);
            
            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });
    });

    describe('Message Handling', () => {
        it('should handle empty messages', async () => {
            const emptyActivity = { ...mockActivity, text: '' };
            const emptyContext = {
                ...mockContext,
                activity: emptyActivity as Activity
            };

            await handler.handleMessage(emptyContext as TurnContext);

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('empty message')
            );
        });

        it('should handle general queries without session content', async () => {
            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    }),
                    expect.objectContaining({
                        role: 'user',
                        content: 'test message'
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should handle queries with session content', async () => {
            const conversationId = 'test-conversation';
            handler.addDocumentToSession(conversationId, 'test document content');
            handler.addFileContext(conversationId, {
                fileName: 'test.txt',
                fileType: 'Text',
                uploadTime: new Date(),
                content: 'test document content'
            });

            await handler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('test document content')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should handle errors gracefully', async () => {
            mockOpenAIService.getStreamingCompletion.mockRejectedValue(new Error('Test error'));

            await handler.handleMessage(mockContext as TurnContext);

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('Sorry, I encountered an error')
            );
        });
    });
});
