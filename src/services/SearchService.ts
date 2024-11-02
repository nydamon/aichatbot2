import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { 
    SearchDocument, 
    SearchDocumentInput,
    SearchOptions, 
    SearchResponse 
} from '../types/SearchTypes';

export class SearchService {
    private client: SearchClient<SearchDocument>;

    constructor() {
        try {
            const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
            const apiKey = process.env.AZURE_SEARCH_API_KEY;
            const indexName = process.env.AZURE_SEARCH_INDEX_NAME;

            if (!endpoint || !apiKey || !indexName) {
                throw new Error('Azure Search configuration missing. Check environment variables.');
            }

            // Log configuration (remove in production)
            console.log('Search Service Configuration:', {
                endpoint,
                indexName,
                apiKeyLength: apiKey.length
            });

            this.client = new SearchClient<SearchDocument>(
                endpoint,
                indexName,
                new AzureKeyCredential(apiKey)
            );

            console.log('SearchService initialized successfully');
        } catch (error) {
            console.error('Error initializing SearchService:', error);
            throw error;
        }
    }

    async searchDocuments(searchText: string, options?: SearchOptions): Promise<SearchResponse> {
        try {
            console.log('Searching documents with text:', searchText);
            const searchResults = await this.client.search(searchText, {
                filter: options?.filter,
                select: options?.select,
                top: options?.top,
                orderBy: options?.orderBy
            });

            return {
                results: await this.getAllResults(searchResults)
            };
        } catch (error) {
            console.error('Error searching documents:', error);
            throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async getAllResults(searchResults: any) {
        const results = [];
        try {
            for await (const result of searchResults.results) {
                results.push({
                    document: result.document,
                    score: result.score
                });
            }
            return results;
        } catch (error) {
            console.error('Error getting all results:', error);
            throw error;
        }
    }

    async uploadDocument(document: SearchDocument): Promise<void> {
        try {
            // Log the document being uploaded (remove sensitive info)
            console.log('Attempting to upload document:', {
                id: document.id,
                fileName: document.fileName,
                fileType: document.fileType,
                contentLength: document.content?.length || 0
            });

            // Validate document
            if (!document.id || !document.content) {
                throw new Error('Document missing required fields (id or content)');
            }

            // Ensure all required fields are present
            const processedDocument = {
                ...document,
                timestamp: document.timestamp || new Date().toISOString(),
                '@search.action': 'upload'
            };

            // Attempt to upload
            const result = await this.client.uploadDocuments([processedDocument]);
            
            // Check results
            if (result.results?.[0]?.succeeded !== true) {
                throw new Error(`Upload failed: ${result.results?.[0]?.errorMessage || 'Unknown error'}`);
            }

            console.log('Document uploaded successfully');
        } catch (error) {
            console.error('Error uploading document:', error);
            
            // Enhanced error handling
            if (error instanceof Error) {
                if (error.message.includes('403')) {
                    throw new Error(`Authentication failed: Please check your Azure Search API key and permissions. 
                        Endpoint: ${process.env.AZURE_SEARCH_ENDPOINT}
                        Index: ${process.env.AZURE_SEARCH_INDEX_NAME}`);
                }
                if (error.message.includes('404')) {
                    throw new Error(`Index not found: Please verify the index '${process.env.AZURE_SEARCH_INDEX_NAME}' exists`);
                }
            }
            throw new Error('Failed to upload document: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    async deleteDocument(id: string): Promise<void> {
        try {
            console.log('Deleting document:', id);
            const documentToDelete: SearchDocumentInput = { 
                id,
                '@search.action': 'delete'
            };
            await this.client.deleteDocuments([documentToDelete as any]);
            console.log('Document deleted successfully');
        } catch (error) {
            console.error('Error deleting document:', error);
            throw new Error('Failed to delete document');
        }
    }

    async getDocument(id: string): Promise<SearchDocument | null> {
        try {
            console.log('Getting document:', id);
            return await this.client.getDocument(id);
        } catch (error) {
            console.error('Error getting document:', error);
            throw new Error('Failed to get document');
        }
    }
}
