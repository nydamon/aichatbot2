import { TurnContext, Attachment } from 'botbuilder';
import { FileUploadResult, DocumentMetadata } from '../types/FileTypes';
import pdf from 'pdf-parse';  // Add proper import for pdf-parse
import { v4 as uuidv4 } from 'uuid';  // Add import for UUID generation

export class FileHandler {
    private readonly SUPPORTED_FILE_TYPES = ['.pdf', '.txt', '.doc', '.docx'];
    private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    constructor() {}

    public async handleFileUpload(context: TurnContext): Promise<FileUploadResult[]> {
        if (!context.activity.attachments || context.activity.attachments.length === 0) {
            return [];  // Return empty array instead of null
        }

        const results: FileUploadResult[] = [];

        for (const attachment of context.activity.attachments) {
            try {
                const result = await this.processAttachment(attachment);
                if (result) {
                    results.push(result);
                }
            } catch (error) {
                console.error('Error processing attachment:', error);
                results.push({
                    success: false,
                    documentId: '',
                    content: '',
                    error: (error as any).message,
                    metadata: this.createEmptyMetadata(attachment.name || 'unknown')
                });
            }
        }

        return results;
    }

    private async processAttachment(attachment: Attachment): Promise<FileUploadResult | null> {
        if (!attachment.contentUrl) {
            return {
                success: false,
                documentId: '',
                content: '',
                error: 'No content URL provided',
                metadata: this.createEmptyMetadata(attachment.name || 'unknown')
            };
        }

        try {
            const fileBuffer = await this.downloadAttachment(attachment.contentUrl);
            const fileName = attachment.name || 'unknown';
            const fileExtension = this.getFileExtension(fileName);

            if (!this.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
                return {
                    success: false,
                    documentId: '',
                    content: '',
                    error: 'Unsupported file type',
                    metadata: this.createEmptyMetadata(fileName)
                };
            }

            if (fileBuffer.length > this.MAX_FILE_SIZE) {
                return {
                    success: false,
                    documentId: '',
                    content: '',
                    error: 'File too large',
                    metadata: this.createEmptyMetadata(fileName)
                };
            }

            const content = await this.extractContent(fileBuffer, fileExtension);
            const documentId = uuidv4();

            return {
                success: true,
                documentId,
                content,
                metadata: {
                    fileName,
                    fileType: fileExtension,
                    uploadTime: new Date(),
                    source: 'teams-upload',
                    size: fileBuffer.length
                }
            };

        } catch (error) {
            console.error('Error processing attachment:', error);
            return {
                success: false,
                documentId: '',
                content: '',
                error: (error as any).message,
                metadata: this.createEmptyMetadata(attachment.name || 'unknown')
            };
        }
    }

    private async downloadAttachment(contentUrl: string): Promise<Buffer> {
        // Implement your download logic here
        throw new Error('Download attachment not implemented');
    }

    private async extractContent(buffer: Buffer, fileType: string): Promise<string> {
        switch (fileType.toLowerCase()) {
            case '.pdf':
                const data = await pdf(buffer);
                return data.text;
            case '.txt':
                return buffer.toString('utf-8');
            default:
                throw new Error(`Unsupported file type: ${fileType}`);
        }
    }

    private getFileExtension(fileName: string): string {
        const match = fileName.match(/\.[0-9a-z]+$/i);
        return match ? match[0].toLowerCase() : '';
    }

    private createEmptyMetadata(fileName: string): DocumentMetadata {
        return {
            fileName,
            fileType: this.getFileExtension(fileName),
            uploadTime: new Date(),
            source: 'teams-upload',
            size: 0
        };
    }
}
