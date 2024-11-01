import { TurnContext, Attachment } from 'botbuilder';
import { IFileHandler } from '../interfaces/IFileHandler';
import { OpenAIService } from '../services/OpenAIService';
import { StorageService } from '../services/StorageService';
import fetch from 'node-fetch';
import pdf from 'pdf-parse';

export class FileHandler implements IFileHandler {
    private readonly SUPPORTED_FILE_TYPES = ['.txt', '.md', '.csv', '.json', '.pdf'];
    private openAIService: OpenAIService;
    private storageService: StorageService;

    constructor(openAIService: OpenAIService, storageService: StorageService) {
        this.openAIService = openAIService;
        this.storageService = storageService;
    }

    async handleFileUpload(context: TurnContext): Promise<void> {
        if (!context.activity.attachments || context.activity.attachments.length === 0) {
            await context.sendActivity('No attachments found.');
            return;
        }

        const attachment = context.activity.attachments[0];
        const fileExtension = this.getFileExtension(attachment.name || '');

        if (!this.SUPPORTED_FILE_TYPES.includes(fileExtension)) {
            await context.sendActivity('Unsupported file type.');
            return;
        }

        try {
            const fileContent = await this.downloadAttachment(attachment);
            let textContent = '';

            if (fileExtension === '.pdf') {
                const buffer = Buffer.from(fileContent, 'binary');
                textContent = await this.extractTextFromPDF(buffer);
            } else {
                textContent = fileContent;
            }

            const analysis = await this.analyzeContent(textContent);
            await context.sendActivity(analysis);

        } catch (error) {
            console.error('Error handling file upload:', error);
            await context.sendActivity('Failed to process the uploaded file.');
        }
    }

    async downloadAttachment(attachment: Attachment): Promise<string> {
        if (!attachment.contentUrl) {
            throw new Error('No content URL in attachment');
        }

        const response = await fetch(attachment.contentUrl);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        return await response.text();
    }

    async extractTextFromPDF(buffer: Buffer): Promise<string> {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error('Failed to extract text from PDF');
        }
    }

    async analyzeContent(content: string): Promise<string> {
        const messages = [
            {
                role: "system" as const,
                content: "You are an AI assistant that analyzes documents. Provide a brief initial analysis of the uploaded content, including type of content, structure, and key elements found."
            },
            {
                role: "user" as const,
                content: `Please analyze this content:\n\n${content.substring(0, 2000)}...`
            }
        ];

        try {
            return await this.openAIService.getChatCompletion(messages);
        } catch (error) {
            console.error('Error analyzing content:', error);
            return 'An error occurred while analyzing the content.';
        }
    }

    private getFileExtension(filename: string): string {
        const match = filename.match(/\.[0-9a-z]+$/i);
        return match ? match[0].toLowerCase() : '';
    }
}
