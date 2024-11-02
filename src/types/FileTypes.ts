// src/types/FileTypes.ts

import { ChatMessage } from "./ChatTypes";

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
    documents: Record<string, { content: string; metadata: any }>;
    documentContext: boolean;
    lastQuestionTimestamp: number | undefined;
    contextExpiryTime: number | undefined;
    processedFiles: any[];
    messageHistory: ChatMessage[];
}
