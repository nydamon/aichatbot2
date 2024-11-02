// src/types/FileTypes.ts

export interface DocumentMetadata {
    fileName: string;
    fileType: string;
    uploadTime: Date;
    source: string;
    size: number;
}

export interface FileUploadResult {
    success: boolean;
    documentId: string;  // Added this
    content: string;     // Removed optional
    error?: string;
    metadata: DocumentMetadata;  // Added this
}

export interface FileAnalysisResult {
    summary: string;
    type: string;
    confidence: number;
}

export interface ConversationState {
    documents: {
        [key: string]: {
            content: string;
            metadata: DocumentMetadata;
        }
    };
    documentContext: boolean;
    lastQuestionTimestamp?: number;
    contextExpiryTime?: number;
    processedFiles?: FileUploadResult[];
}
