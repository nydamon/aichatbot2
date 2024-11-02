// FileHandler.ts
import { TurnContext, Attachment } from 'botbuilder';
import axios from 'axios';
import pdf from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadResult, DocumentMetadata } from '../types/FileTypes';
import { StorageService } from '../services/StorageService';

export class FileHandler {
    private readonly SUPPORTED_FILE_TYPES = ['.pdf', '.txt'];
    private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private storageService: StorageService;

    constructor(storageService: StorageService) {
        this.storageService = storageService;
    }

    async handleFileUpload(context: TurnContext): Promise<FileUploadResult[]> {
        if (!context.activity.attachments || context.activity.attachments.length === 0) {
            return [];
        }

        const results: FileUploadResult[] = [];

        for (const attachment of context.activity.attachments) {
            try {
                const result = await this.processAttachment(attachment);
                results.push(result);
            } catch (error) {
                console.error('Error processing attachment:', error);
                results.push({
                    success: false,
                    documentId: '',
                    content: '',
                    error: (error as Error).message,
                    metadata: this.createEmptyMetadata(attachment.name || 'unknown')
                });
            }
        }

        return results;
    }

    async downloadAttachment(contentUrl: string): Promise<Buffer> {
        try {
            const response = await axios.get(contentUrl, {
                responseType: 'arraybuffer'
            });
            return Buffer.from(response.data);
        } catch (error) {
            console.error('Download error:', error);
            throw new Error(`Failed to download: ${(error as Error).message}`);
        }
    }

    private async processAttachment(attachment: Attachment): Promise<FileUploadResult> {
        if (!attachment.contentUrl) {
            throw new Error('No content URL provided');
        }

        const fileName = attachment.name || 'unknown';
        const fileExtension = this.getFileExtension(fileName);

        if (!this.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
            throw new Error(`Unsupported file type: ${fileExtension}`);
        }

        const fileBuffer = await this.downloadAttachment(attachment.contentUrl);
        
        if (fileBuffer.length > this.MAX_FILE_SIZE) {
            throw new Error('File size exceeds limit');
        }

        const content = await this.extractContent(fileBuffer, fileExtension);
        const documentId = uuidv4();

        // Store file in Azure Storage
        await this.storageService.uploadFile(
            'gpts-attachments',
            `${documentId}${fileExtension}`,
            fileBuffer
        );

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
