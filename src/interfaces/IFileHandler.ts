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
    documentId: string;
    content: string;
    metadata: DocumentMetadata;
}

export interface IFileHandler {
    handleFileUpload(context: TurnContext): Promise<FileUploadResult[] | null>;
    downloadAttachment(attachment: Attachment): Promise<Buffer>; // Make this public in the interface
    extractTextFromPDF(buffer: Buffer): Promise<string>; //Ensure consistency in the interface and export
    analyzeContent(content: string): Promise<string>;
}

