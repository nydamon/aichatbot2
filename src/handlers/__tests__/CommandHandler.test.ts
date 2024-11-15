import { CommandHandler } from '../CommandHandler';
import { ConversationService } from '../../services/ConversationService';
import { SearchService } from '../../services/SearchService';
import { TurnContext, Activity, ActivityTypes, ConversationAccount, MessageFactory } from 'botbuilder';
import { ChatMessage } from '../../types/ChatTypes';
import { SearchDocument } from '../../types/SearchTypes';

jest.mock('../../services/ConversationService');
jest.mock('../../services/SearchService');

describe('CommandHandler', () => {
    let handler: CommandHandler;
    let mockConversationService: jest.Mocked<ConversationService>;
    let mockSearchService: jest.Mocked<SearchService>;
    let mockContext: Partial<TurnContext>;
    let mockActivity: Partial<Activity>;
    let mockConversation: ConversationAccount;

    beforeEach(() => {
        mockConversationService = {
            getHistory: jest.fn(),
            addMessage: jest.fn(),
            clearHistory: jest.fn(),
            hasRecentFileUpload: jest.fn()
        } as unknown as jest.Mocked<ConversationService>;

        mockSearchService = {
            searchDocuments: jest.fn(),
            getDocument: jest.fn(),
            indexDocument: jest.fn(),
            indexDocuments: jest.fn(),
            deleteDocument: jest.fn(),
            deleteDocuments: jest.fn()
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
            channelId: 'test-channel',
            from: { id: 'user1', name: 'Test User' },
            conversation: mockConversation,
            recipient: { id: 'bot', name: 'Test Bot' },
            serviceUrl: 'https://test.com',
            channelData: {},
            localTimezone: 'UTC',
            callerId: 'test-caller',
            text: '/help'
        };

        mockContext = {
            activity: mockActivity as Activity,
            sendActivity: jest.fn().mockResolvedValue({})
        };

        handler = new CommandHandler(mockConversationService, mockSearchService);
    });

    describe('Command Processing', () => {
        it('should handle help command', async () => {
            await handler.handleCommand(mockContext as TurnContext, '/help');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Available Commands')
                })
            );
        });

        it('should handle clear command', async () => {
            await handler.handleCommand(mockContext as TurnContext, '/clear');

            expect(mockConversationService.clearHistory).toHaveBeenCalledWith('test-conversation');
            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('has been cleared')
                })
            );
        });

        it('should handle files command', async () => {
            const mockSearchResults = [{
                document: {
                    id: 'doc1',
                    title: 'Test Document',
                    content: 'Test content',
                    url: 'http://test.com',
                    fileName: 'test.txt',
                    fileType: 'text/plain'
                },
                score: 0.8
            }];

            mockSearchService.searchDocuments.mockResolvedValue(mockSearchResults);

            await handler.handleCommand(mockContext as TurnContext, '/files');

            expect(mockSearchService.searchDocuments).toHaveBeenCalled();
            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Recently Uploaded Files')
                })
            );
        });

        it('should handle sop search command', async () => {
            const mockSearchResults = [{
                document: {
                    id: 'doc1',
                    title: 'Test SOP',
                    content: 'Test content',
                    url: 'http://test.com'
                },
                score: 0.8
            }];

            mockSearchService.searchDocuments.mockResolvedValue(mockSearchResults);

            await handler.handleCommand(mockContext as TurnContext, '/sop test query');

            expect(mockSearchService.searchDocuments).toHaveBeenCalledWith(
                'test query',
                expect.any(Object)
            );
            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('Here are the relevant documents')
            );
        });

        it('should handle unknown commands', async () => {
            await handler.handleCommand(mockContext as TurnContext, '/unknown');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Unknown command')
                })
            );
        });

        it('should handle empty commands', async () => {
            await handler.handleCommand(mockContext as TurnContext, '');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('Unknown command')
                })
            );
        });

        it('should handle errors gracefully', async () => {
            mockSearchService.searchDocuments.mockRejectedValue(new Error('Search failed'));

            await handler.handleCommand(mockContext as TurnContext, '/sop test');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('An error occurred')
            );
        });
    });
});
