import { FileHandler } from '../handlers/FileHandler';
import { StorageService } from '../services/StorageService';
import { OpenAIService } from '../services/OpenAIService';
import { TurnContext, Activity, ActivityTypes, ConversationAccount } from 'botbuilder';

jest.mock('../services/StorageService');
jest.mock('../services/OpenAIService');

describe('Document Processing Integration Tests', () => {
    let fileHandler: FileHandler;
    let mockStorageService: jest.Mocked<StorageService>;
    let mockOpenAIService: jest.Mocked<OpenAIService>;
    let mockContext: Partial<TurnContext>;
    let mockConversation: ConversationAccount;
    let mockActivity: Partial<Activity>;

    beforeEach(() => {
        mockStorageService = {
            uploadFile: jest.fn().mockResolvedValue('test-document-id'),
            downloadFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
            deleteFile: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<StorageService>;

        mockOpenAIService = {
            getStreamingCompletion: jest.fn().mockImplementation(async (messages, callback) => {
                await callback('Test response');
                return;
            })
        } as unknown as jest.Mocked<OpenAIService>;

        mockConversation = {
            id: 'test-conversation',
            name: 'Test Conversation',
            conversationType: 'personal',
            isGroup: false
        };

        mockActivity = {
            type: ActivityTypes.Message,
            attachments: [{
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                contentUrl: 'http://test.com/test.xlsx',
                name: 'test.xlsx'
            }],
            conversation: mockConversation
        };

        mockContext = {
            activity: mockActivity as Activity,
            sendActivity: jest.fn().mockResolvedValue({ id: '1' })
        };

        fileHandler = new FileHandler(mockStorageService, mockOpenAIService);

        // Mock fetch for downloadAttachment
        global.fetch = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
            })
        ) as jest.Mock;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('End-to-End File Processing', () => {
        it('should handle file upload and question processing', async () => {
            // Upload file
            const uploadResults = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(uploadResults[0].success).toBe(true);
            expect(uploadResults[0].documentId).toBe('test-document-id');

            // Process question
            await fileHandler.processFileWithQuestion(
                mockContext as TurnContext,
                'test-document-id',
                'What is in this file?'
            );

            // Verify interactions
            expect(mockStorageService.uploadFile).toHaveBeenCalled();
            expect(mockStorageService.downloadFile).toHaveBeenCalled();
            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalled();
            expect(mockStorageService.deleteFile).toHaveBeenCalled();
        });

        it('should handle multiple file uploads', async () => {
            // Upload first file
            const firstUpload = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(firstUpload[0].success).toBe(true);

            // Upload second file
            mockActivity.attachments![0].name = 'test2.xlsx';
            const secondUpload = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(secondUpload[0].success).toBe(true);

            // Verify both files were processed
            expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(2);
        });

        it('should handle file cleanup properly', async () => {
            // Upload and process file
            const uploadResults = await fileHandler.handleFileUpload(mockContext as TurnContext);
            await fileHandler.processFileWithQuestion(
                mockContext as TurnContext,
                'test-document-id',
                'What is in this file?'
            );

            // Try to process again - should fail
            await fileHandler.processFileWithQuestion(
                mockContext as TurnContext,
                'test-document-id',
                'Another question'
            );

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                'File not found. Please upload the file again.'
            );
        });

        it('should handle different file types', async () => {
            // Test Excel file
            const excelResults = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(excelResults[0].success).toBe(true);

            // Test CSV file
            mockActivity.attachments![0] = {
                contentType: 'text/csv',
                contentUrl: 'http://test.com/test.csv',
                name: 'test.csv'
            };
            const csvResults = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(csvResults[0].success).toBe(true);

            // Test PDF file
            mockActivity.attachments![0] = {
                contentType: 'application/pdf',
                contentUrl: 'http://test.com/test.pdf',
                name: 'test.pdf'
            };
            const pdfResults = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(pdfResults[0].success).toBe(true);
        });

        it('should handle file processing errors gracefully', async () => {
            // Upload file first to track it
            const uploadResults = await fileHandler.handleFileUpload(mockContext as TurnContext);
            const documentId = uploadResults[0].documentId!;

            // Mock error in file processing
            mockStorageService.downloadFile.mockRejectedValueOnce(new Error('Processing failed'));

            await fileHandler.processFileWithQuestion(
                mockContext as TurnContext,
                documentId,
                'What is in this file?'
            );

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                'Sorry, I encountered an error processing your question.'
            );
        });

        it('should provide helpful file analysis', async () => {
            const results = await fileHandler.handleFileUpload(mockContext as TurnContext);
            expect(results[0].success).toBe(true);

            // Verify adaptive card was sent with file analysis
            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    attachments: expect.arrayContaining([
                        expect.objectContaining({
                            content: expect.objectContaining({
                                body: expect.arrayContaining([
                                    expect.objectContaining({
                                        text: expect.stringContaining('File Analysis')
                                    })
                                ])
                            })
                        })
                    ])
                })
            );
        });
    });
});
