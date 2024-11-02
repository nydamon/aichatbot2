import fetch from 'node-fetch';
import pdf from 'pdf-parse';
import { TurnContext, Attachment } from 'botbuilder';
import { IFileHandler, FileUploadResult, DocumentMetadata } from '../interfaces/IFileHandler';
import { OpenAIService } from '../services/OpenAIService';
import { StorageService } from '../services/StorageService';
import { SearchService } from '../services/SearchService';

export class FileHandler implements IFileHandler {
    private readonly SUPPORTED_FILE_TYPES = ['.txt', '.md', '.csv', '.json', '.pdf'];
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

    constructor(
        private openAIService: OpenAIService,
        private storageService: StorageService,
        private searchService: SearchService
    ) {}


    async analyzeContent(content: string): Promise<string> {
        // Implement content analysis logic here
        return "Content analysis not implemented";
    }
    async handleFileUpload(context: TurnContext): Promise<FileUploadResult | null> {
        if (!context.activity.attachments || context.activity.attachments.length === 0) {
            await context.sendActivity('No attachments found.');
            return null;
        }
    
        const attachment = context.activity.attachments[0];
        const fileExtension = this.getFileExtension(attachment.name || '');
    
        if (!this.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
            await context.sendActivity(`Unsupported file type. Supported types: ${this.SUPPORTED_FILE_TYPES.join(', ')}`);
            return null;
        }
    
        try {
            await context.sendActivity('Processing your file...');
    
            const fileBuffer = await this.downloadAttachment(attachment);
    
            if (fileBuffer.length > this.MAX_FILE_SIZE) {
                await context.sendActivity(`File too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
                return null;
            }
    
            const timestamp = Date.now();
            const sanitizedFileName = attachment.name?.replace(/[^a-zA-Z0-9.-]/g, '_') || 'unnamed';
            const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    
            const blobUrl = await this.storageService.uploadFile(
                process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents',
                uniqueFileName,
                fileBuffer
            );
    
            let textContent = '';
            if (fileExtension === '.pdf') {
                textContent = await this.extractTextFromPDF(fileBuffer);
            } else {
                textContent = fileBuffer.toString('utf-8');
            }
    
            if (!textContent || textContent.trim().length === 0) {
                await context.sendActivity('No text content could be extracted from the file.');
                return null;
            }
    
            const metadata: DocumentMetadata = {
                fileName: attachment.name || 'unnamed',
                fileType: fileExtension.replace('.', ''),
                uploadTime: new Date(),
                source: 'user-upload',
                size: fileBuffer.length
            };
    
            const searchDoc = {
                id: uniqueFileName,
                content: textContent,
                fileName: metadata.fileName,
                fileType: metadata.fileType,
                timestamp: metadata.uploadTime.toISOString(),
                url: blobUrl,
                source: metadata.source
            };
    
            this.searchService.uploadDocument(searchDoc).catch(error => {
                console.error('Search index upload error:', error);
            });
    
            return {
                documentId: uniqueFileName,
                content: textContent,
                metadata: metadata
            };
    
        } catch (error) {
            console.error('Error handling file upload:', error);
            await context.sendActivity('An error occurred while processing your file. Please try again.');
            return null;
        }
    }
    

    public async downloadAttachment(attachment: Attachment): Promise<Buffer> {
        if (!attachment.contentUrl) {
            throw new Error('Attachment content URL is undefined');
        }
        const response = await fetch(attachment.contentUrl);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }
        return Buffer.from(await response.arrayBuffer());
    }

    public async extractTextFromPDF(buffer: Buffer): Promise<string> {
        const data = await pdf(buffer, { max: 0 });
        if (!data.text || data.text.trim().length === 0) {
            throw new Error('No text content extracted');
        }
        return data.text;
    }

    private getFileExtension(filename: string): string {
        const match = filename.match(/\.[0-9a-z]+$/i);
        return match ? match[0].toLowerCase() : '';
    }
}
