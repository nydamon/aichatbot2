import { 
    SearchClient, 
    AzureKeyCredential,
    SearchOptions 
} from '@azure/search-documents';

interface SearchDocument {
    id: string;
    title?: string; // Ensure the title property is included
    content: string;
    url?: string; // Ensure the url property is included
    metadata?: {
        fileName?: string;
        contentType?: string;
        size?: number;
    };
}

interface SearchResultDocument {
    document: SearchDocument;
}

interface SearchError extends Error {
    statusCode?: number;
    details?: unknown;
}

export class SearchService {
    private client: SearchClient<SearchDocument>;

    constructor(endpoint: string, indexName: string, apiKey: string) {
        this.client = new SearchClient<SearchDocument>(
            endpoint,
            indexName,
            new AzureKeyCredential(apiKey)
        );
    }

    async searchDocuments(query: string): Promise<SearchResultDocument[]> {
        try {
            const searchOptions: SearchOptions<SearchDocument> = {
                top: 5,
                select: ['id', 'title', 'content', 'url'] // Ensure url is selected
            };

            const searchResponse = await this.client.search(query, searchOptions);
            const results: SearchResultDocument[] = [];

            for await (const result of searchResponse.results ?? []) {
                results.push({ document: result.document });
            }

            return results;

        } catch (err: unknown) {
            const error = err as SearchError;
            console.error('Search Error:', {
                message: error?.message ?? 'Unknown error',
                status: error?.statusCode,
                details: error?.details
            });
            throw new Error('Failed to search documents');
        }
    }

    async getDocument(documentId: string): Promise<SearchDocument | null> {
        try {
            const document = await this.client.getDocument(documentId);
            return document;
        } catch (error) {
            console.error('Error fetching document:', error);
            return null;
        }
    }
}
