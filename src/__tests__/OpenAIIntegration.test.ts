import { MessageHandler } from '../handlers/MessageHandler';
import { OpenAIService } from '../services/OpenAIService';
import { SearchService } from '../services/SearchService';
import { TurnContext, Activity, ActivityTypes, ConversationAccount } from 'botbuilder';

jest.mock('../services/SearchService');
jest.mock('../services/OpenAIService');

describe('OpenAI Integration Tests', () => {
    let messageHandler: MessageHandler;
    let mockOpenAIService: jest.Mocked<OpenAIService>;
    let mockSearchService: jest.Mocked<SearchService>;
    let mockContext: Partial<TurnContext>;
    let mockConversation: ConversationAccount;
    let mockActivity: Partial<Activity>;

    beforeEach(() => {
        mockOpenAIService = {
            getChatCompletion: jest.fn(),
            getStreamingCompletion: jest.fn(),
            getEmbedding: jest.fn(),
            getFunctionCompletion: jest.fn()
        } as unknown as jest.Mocked<OpenAIService>;

        mockSearchService = {
            searchDocuments: jest.fn(),
            getDocument: jest.fn()
        } as unknown as jest.Mocked<SearchService>;

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

        messageHandler = new MessageHandler(mockSearchService, mockOpenAIService);

        mockContext = {
            activity: mockActivity as Activity,
            sendActivity: jest.fn().mockResolvedValue({ id: '1' })
        };

        mockOpenAIService.getStreamingCompletion.mockImplementation(
            async (messages, callback) => {
                await callback('Test response');
                return;
            }
        );
    });

    describe('Document Processing with OpenAI', () => {
        it('should process documents in current session', async () => {
            const conversationId = 'test-conversation';
            messageHandler.addDocumentToSession(conversationId, 'Test document content for analysis');
            messageHandler.addFileContext(conversationId, {
                fileName: 'test.txt',
                fileType: 'Text',
                uploadTime: new Date(),
                content: 'Test document content for analysis'
            });

            await messageHandler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('You are an AI assistant helping with document analysis')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should handle multiple documents in session', async () => {
            const conversationId = 'test-conversation';
            messageHandler.addDocumentToSession(conversationId, 'First document content');
            messageHandler.addDocumentToSession(conversationId, 'Second document content');
            messageHandler.addFileContext(conversationId, {
                fileName: 'doc1.txt',
                fileType: 'Text',
                uploadTime: new Date(),
                content: 'First document content'
            });

            await messageHandler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('You are an AI assistant helping with document analysis')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should clear session documents', async () => {
            const conversationId = 'test-conversation';
            messageHandler.addDocumentToSession(conversationId, 'Test content');
            messageHandler.clearSessionDocuments(conversationId);

            await messageHandler.handleMessage(mockContext as TurnContext);

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

        it('should handle file-specific questions', async () => {
            const conversationId = 'test-conversation';
            messageHandler.addFileContext(conversationId, {
                fileName: 'data.xlsx',
                fileType: 'Excel',
                uploadTime: new Date()
            });

            mockActivity.text = 'how many rows are there?';
            await messageHandler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('You are an AI assistant helping with document analysis')
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

        it('should handle questions about file content', async () => {
            const conversationId = 'test-conversation';
            messageHandler.addFileContext(conversationId, {
                fileName: 'report.pdf',
                fileType: 'PDF',
                uploadTime: new Date(),
                content: 'Annual report data with financial metrics'
            });

            mockActivity.text = 'what are the financial metrics?';
            await messageHandler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('You are an AI assistant helping with document analysis')
                    }),
                    expect.objectContaining({
                        role: 'user',
                        content: expect.stringContaining('what are the financial metrics?')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });

        it('should maintain file context between questions', async () => {
            const conversationId = 'test-conversation';
            messageHandler.addFileContext(conversationId, {
                fileName: 'data.xlsx',
                fileType: 'Excel',
                uploadTime: new Date(),
                content: 'Sales data by quarter'
            });

            // First question
            mockActivity.text = 'how many rows?';
            await messageHandler.handleMessage(mockContext as TurnContext);

            // Second question
            mockActivity.text = 'what is the total sales?';
            await messageHandler.handleMessage(mockContext as TurnContext);

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenLastCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'system',
                        content: expect.stringContaining('You are an AI assistant helping with document analysis')
                    })
                ]),
                expect.any(Function),
                expect.any(Object)
            );
        });
    });
});
