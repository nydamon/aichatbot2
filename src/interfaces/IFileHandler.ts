import { TurnContext, Attachment } from 'botbuilder';

export interface DocumentMetadata {
    fileName: string;
    fileType: string;
    uploadTime: Date;
    source: string;
    size: number;
}

export interface FileUploadResult {
    documentId: string;
    content: string;
    metadata: DocumentMetadata;
}

export interface IFileHandler {
    // Make it clear when null/undefined might be returned
    handleFileUpload(context: TurnContext): Promise<FileUploadResult | null>;
    downloadAttachment(attachment: Attachment): Promise<Buffer>;
    extractTextFromPDF(buffer: Buffer): Promise<string>;
    analyzeContent(content: string): Promise<string>;
}
