// IFileHandler.ts
import { TurnContext, Attachment } from 'botbuilder';

export interface DocumentMetadata {
    fileName: string;
    fileType: string;
    uploadTime: Date;
    source: string;
    size: number;
}

export interface FileUploadResult {
    success: boolean;
    documentId: string;
    content: string;
    error?: string;
    metadata: DocumentMetadata;
}

export interface IFileHandler {
    handleFileUpload(context: TurnContext): Promise<FileUploadResult[] | null>;
    downloadAttachment(attachment: Attachment): Promise<Buffer>;
    extractTextFromPDF(buffer: Buffer): Promise<string>;
    analyzeContent(content: string): Promise<string>;
}

