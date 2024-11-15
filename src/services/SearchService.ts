import { 
    SearchClient, 
    AzureKeyCredential,
    SearchOptions as AzureSearchOptions
} from '@azure/search-documents';
import {
    BaseDocument,
    IndexDocument,
    SearchDocument,
    SearchResultDocument,
    SearchError,
    SearchFields,
    SimpleSearchOptions
} from '../types/SearchTypes';
import { OpenAIService } from './OpenAIService';

export class SearchService {
    private client: SearchClient<SearchDocument>;
    private openAIService: OpenAIService;
    private readonly defaultSelect: SearchFields[] = ['id', 'title', 'content', 'url'];
    private readonly defaultSearchFields: SearchFields[] = ['content', 'title'];

    constructor(endpoint: string, indexName: string, apiKey: string, openAIService: OpenAIService) {
        this.client = new SearchClient<SearchDocument>(
            endpoint,
            indexName,
            new AzureKeyCredential(apiKey)
        );
        this.openAIService = openAIService;
    }

    private async processDocumentContent(content: string): Promise<{
        summary: string;
        keyPhrases: string[];
    }> {
        // Extract structured information using function calling
        const structuredInfo = await this.openAIService.getFunctionCompletion<{
            summary: string;
            key_phrases: string[];
        }>(
            [{
                role: 'user',
                content: `Analyze this document content and extract key information: ${content}`
            }],
            'analyze_document',
            {
                summary: {
                    type: 'string',
                    description: 'A concise summary of the document'
                },
                key_phrases: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Important phrases and topics from the document'
                }
            }
        );

        return {
            summary: structuredInfo.summary,
            keyPhrases: structuredInfo.key_phrases
        };
    }

    async indexDocument(document: IndexDocument): Promise<void> {
        try {
            // Process document content for enhanced search capabilities
            const { summary, keyPhrases } = await this.processDocumentContent(document.content);

            const enrichedDocument = {
                ...document,
                timestamp: new Date().toISOString()
            };

            await this.client.uploadDocuments([enrichedDocument]);
            
            // Wait for indexing to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: unknown) {
            const error = err as SearchError;
            console.error('Indexing Error:', {
                message: error?.message ?? 'Unknown error',
                status: error?.statusCode,
                details: error?.details
            });
            throw new Error('Failed to index document');
        }
    }

    async indexDocuments(documents: IndexDocument[]): Promise<void> {
        try {
            // Process all documents in parallel
            const enrichedDocs = await Promise.all(
                documents.map(async (doc) => {
                    const { summary, keyPhrases } = await this.processDocumentContent(doc.content);
                    return {
                        ...doc,
                        timestamp: new Date().toISOString()
                    };
                })
            );

            await this.client.uploadDocuments(enrichedDocs);
            
            // Wait for indexing to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err: unknown) {
            const error = err as SearchError;
            console.error('Batch Indexing Error:', {
                message: error?.message ?? 'Unknown error',
                status: error?.statusCode,
                details: error?.details
            });
            throw new Error('Failed to index documents');
        }
    }

    async searchDocuments(query: string, options?: SimpleSearchOptions): Promise<SearchResultDocument[]> {
        try {
            // Generate optimized search terms
            const searchTerms = await this.openAIService.getFunctionCompletion<{ terms: string[] }>(
                [{
                    role: 'user',
                    content: `Generate optimal search terms for this query: ${query}`
                }],
                'generate_search_terms',
                {
                    terms: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Key search terms extracted from the query'
                    }
                }
            );

            const searchOptions: AzureSearchOptions<SearchDocument> = {
                top: options?.top ?? 5,
                skip: options?.skip,
                select: options?.select ?? this.defaultSelect,
                includeTotalCount: true,
                searchFields: this.defaultSearchFields as readonly SearchFields[],
                searchMode: 'all'
            };

            if (options?.orderBy) {
                searchOptions.orderBy = options.orderBy;
            }

            if (options?.filter) {
                searchOptions.filter = options.filter;
            }

            // Use the optimized search terms
            const searchResponse = await this.client.search(
                searchTerms.terms.join(' OR '),
                searchOptions
            );

            const results: SearchResultDocument[] = [];

            for await (const result of searchResponse.results ?? []) {
                if (!result.document.content) {
                    result.document.content = '';
                }
                
                results.push({
                    document: {
                        ...result.document,
                        '@search.score': result.score
                    },
                    score: result.score
                });
            }

            return results;

        } catch (err: unknown) {
            const error = err as SearchError;
            if (error.statusCode === 403) {
                console.error('Search Error: Authentication failed. Please check your API key and permissions.');
                throw new Error('Authentication failed');
            } else {
                console.error('Search Error:', {
                    message: error?.message ?? 'Unknown error',
                    status: error?.statusCode,
                    details: error?.details
                });
                throw new Error('Failed to search documents');
            }
        }
    }

    async getDocument(documentId: string): Promise<SearchDocument | null> {
        try {
            const document = await this.client.getDocument(documentId);
            if (document && !document.content) {
                document.content = '';
            }
            return document;
        } catch (error) {
            if ((error as SearchError).statusCode === 403) {
                console.error('Error fetching document: Authentication failed. Please check your API key and permissions.');
                throw new Error('Authentication failed');
            } else {
                console.error('Error fetching document:', error);
            }
            return null;
        }
    }

    async deleteDocument(documentId: string): Promise<void> {
        try {
            await this.client.deleteDocuments([{ id: documentId } as SearchDocument]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            if ((error as SearchError).statusCode === 403) {
                console.error('Error deleting document: Authentication failed. Please check your API key and permissions.');
                throw new Error('Authentication failed');
            } else {
                console.error('Error deleting document:', error);
            }
            throw new Error('Failed to delete document');
        }
    }

    async deleteDocuments(documentIds: string[]): Promise<void> {
        try {
            const deleteDocuments = documentIds.map(id => ({ id } as SearchDocument));
            await this.client.deleteDocuments(deleteDocuments);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            if ((error as SearchError).statusCode === 403) {
                console.error('Error deleting documents: Authentication failed. Please check your API key and permissions.');
                throw new Error('Authentication failed');
            } else {
                console.error('Error deleting documents:', error);
            }
            throw new Error('Failed to delete documents');
        }
    }
}
