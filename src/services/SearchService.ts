import { 
    SearchClient, 
    AzureKeyCredential,
    SearchOptions 
} from '@azure/search-documents';

interface SearchDocument {
    id: string;
    content: string;
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
                select: ['id', 'content']
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
}
