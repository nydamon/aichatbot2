export interface SearchDocument {
    id: string;
    content: string;
    title?: string;
    category?: string;
    timestamp: string;
    fileType?: string;
    source?: string;
    uploadedBy?: string;
    fileName?: string;
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

export interface SearchResponse {
    results: SearchResult[];
}
