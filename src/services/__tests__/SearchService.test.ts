import { SearchService } from '../SearchService';
import { OpenAIService } from '../OpenAIService';
import { azureSearchConfig } from '../../config/azure-config';
import { SearchDocument } from '../../types/SearchTypes';

jest.mock('@azure/search-documents');
jest.mock('../OpenAIService');

describe('SearchService', () => {
    let service: SearchService;
    let mockOpenAIService: jest.Mocked<OpenAIService>;
    let mockSearchClient: any;

    beforeEach(() => {
        mockOpenAIService = {
            getEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
            getFunctionCompletion: jest.fn().mockResolvedValue({
                summary: 'Test summary',
                key_phrases: ['test', 'phrases'],
                terms: ['test', 'query']
            })
        } as unknown as jest.Mocked<OpenAIService>;

        // Mock the search client
        mockSearchClient = {
            uploadDocuments: jest.fn().mockResolvedValue({}),
            search: jest.fn().mockResolvedValue({
                results: [
                    {
                        document: {
                            id: 'test-id',
                            content: 'Test content',
                            title: 'Test Document'
                        },
                        score: 0.8
                    }
                ]
            }),
            getDocument: jest.fn().mockResolvedValue({
                id: 'test-id',
                content: 'Test content',
                title: 'Test Document'
            }),
            deleteDocuments: jest.fn().mockResolvedValue({})
        };

        service = new SearchService(
            azureSearchConfig.endpoint,
            azureSearchConfig.indexName,
            azureSearchConfig.queryKey,
            mockOpenAIService
        );

        // Set the mocked client
        (service as any).client = mockSearchClient;
    });

    describe('indexDocument', () => {
        it('should process and index a document', async () => {
            const testDoc = {
                id: 'test-id',
                title: 'Test Document',
                content: 'Test content'
            };

            await service.indexDocument(testDoc);

            expect(mockOpenAIService.getFunctionCompletion).toHaveBeenCalled();
            expect(mockSearchClient.uploadDocuments).toHaveBeenCalled();
        });
    });

    describe('searchDocuments', () => {
        it('should perform semantic search with embeddings', async () => {
            const query = 'test query';

            await service.searchDocuments(query);

            expect(mockOpenAIService.getFunctionCompletion).toHaveBeenCalled();
            expect(mockSearchClient.search).toHaveBeenCalled();
        });

        it('should handle search errors gracefully', async () => {
            mockSearchClient.search.mockRejectedValue(new Error('Test error'));

            await expect(service.searchDocuments('test')).rejects.toThrow('Failed to search documents');
        });
    });

    describe('getDocument', () => {
        it('should retrieve a document by id', async () => {
            const mockDocument: SearchDocument = {
                id: 'test-id',
                title: 'Test',
                content: 'Test content'
            };

            mockSearchClient.getDocument.mockResolvedValue(mockDocument);

            const result = await service.getDocument('test-id');
            expect(result).toEqual(mockDocument);
        });
    });

    describe('deleteDocument', () => {
        it('should delete a document by id', async () => {
            await service.deleteDocument('test-id');
            expect(mockSearchClient.deleteDocuments).toHaveBeenCalled();
        });
    });
});
