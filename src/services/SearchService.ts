import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { 
    SearchDocument, 
    SearchDocumentInput,
    SearchOptions, 
    SearchResponse 
} from '../types/SearchTypes';
import { azureSearchConfig } from '../config/azure-config';

export class SearchService {
    private client: SearchClient<SearchDocument>;

    constructor() {
        if (!azureSearchConfig.endpoint || !azureSearchConfig.apiKey || !azureSearchConfig.indexName) {
            throw new Error('Azure Search configuration missing');
        }

        this.client = new SearchClient<SearchDocument>(
            azureSearchConfig.endpoint,
            azureSearchConfig.indexName,
            new AzureKeyCredential(azureSearchConfig.apiKey)
        );
    }

    async searchDocuments(searchText: string, options?: SearchOptions): Promise<SearchResponse> {
        try {
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
            throw new Error('Failed to search documents');
        }
    }

    private async getAllResults(searchResults: any) {
        const results = [];
        for await (const result of searchResults.results) {
            results.push({
                document: result.document,
                score: result.score
            });
        }
        return results;
    }

    async uploadDocument(document: SearchDocument): Promise<void> {
        try {
            await this.client.uploadDocuments([document]);
        } catch (error) {
            console.error('Error uploading document:', error);
            throw new Error('Failed to upload document');
        }
    }

    async deleteDocument(id: string): Promise<void> {
        try {
            const documentToDelete: SearchDocumentInput = { id };
            await this.client.deleteDocuments([documentToDelete as any]);
        } catch (error) {
            console.error('Error deleting document:', error);
            throw new Error('Failed to delete document');
        }
    }

    async getDocument(id: string): Promise<SearchDocument | null> {
        try {
            return await this.client.getDocument(id);
        } catch (error) {
            console.error('Error getting document:', error);
            throw new Error('Failed to get document');
        }
    }

    async mergeOrUpload(document: SearchDocument): Promise<void> {
        try {
            await this.client.mergeOrUploadDocuments([document]);
        } catch (error) {
            console.error('Error merging or uploading document:', error);
            throw new Error('Failed to merge or upload document');
        }
    }
}
