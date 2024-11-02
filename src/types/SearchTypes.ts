export interface SearchDocument {
    id: string;
    title?: string; // Add the title property
    content: string;
    url?: string; // Add the url property
    metadata?: {
        fileName?: string;
        contentType?: string;
        size?: number;
    };
    timestamp: string;
    fileType?: string;
    source?: string;
    uploadedBy?: string;
    [key: string]: unknown;
}

export type SearchDocumentInput = Partial<SearchDocument>;

export interface SearchOptions {
    filter?: string;
    select?: string[];
    top?: number;
    orderBy?: string[];
}

export interface SearchResult {
    document: SearchDocument;
    score?: number;
}

export interface SearchResultDocument {
    title?: string;
    category?: string;
    content?: string;
    document: {
        id: string;
        title?: string;
        category?: string;
        content?: string;
        };
    }

export interface SearchResponse {
    results: SearchResult[];
}
