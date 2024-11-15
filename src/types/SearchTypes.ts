export interface BaseDocument {
    id: string;
    title: string;
    content: string;
    url?: string;
    fileName?: string;
    fileType?: string;
    size?: number;
    uploadTime?: string;
    source?: string;
    timestamp?: string;
    embedding?: number[];
    summary?: string;
    keyPhrases?: string[];
    '@search.score'?: number;
    '@search.rerankerScore'?: number;
}

export interface IndexDocument extends BaseDocument {
    content: string;
}

export interface SearchDocument extends BaseDocument {
    content: string;
}

export interface SearchResultDocument {
    document: SearchDocument;
    score: number;
}

export interface SearchError extends Error {
    statusCode?: number;
    details?: string;
}

export type SearchFields = keyof BaseDocument;

export interface SimpleSearchOptions {
    top?: number;
    skip?: number;
    select?: SearchFields[];
    orderBy?: string[];
    filter?: string;
}
