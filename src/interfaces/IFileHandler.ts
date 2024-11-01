import { TurnContext, Attachment } from 'botbuilder';

export interface IFileHandler {
    handleFileUpload(context: TurnContext): Promise<void>;
    downloadAttachment(attachment: Attachment): Promise<string>;
    extractTextFromPDF(buffer: Buffer): Promise<string>;
    analyzeContent(content: string): Promise<string>;
}
