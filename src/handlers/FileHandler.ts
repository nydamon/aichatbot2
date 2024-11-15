import { TurnContext, CardFactory, Attachment } from 'botbuilder';
import { StorageService } from '../services/StorageService';
import { OpenAIService } from '../services/OpenAIService';
import { ChatMessage } from '../types/ChatTypes';
import { azureStorageConfig } from '../config/azure-config';
import { MessageHandler } from './MessageHandler';
import * as winston from 'winston';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
            return `${timestamp} [${level}] ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

interface FileInfo {
    fileName: string;
    fileType: string;
    size: number;
    preview?: string;
}

export class FileHandler {
    private containerName: string;
    private activeFiles: Set<string> = new Set();

    constructor(
        private storageService: StorageService,
        private openAIService: OpenAIService,
        private messageHandler?: MessageHandler
    ) {
        this.containerName = azureStorageConfig.containerName;
    }

    private async analyzeFile(buffer: Buffer, fileName: string): Promise<FileInfo> {
        const fileInfo: FileInfo = {
            fileName,
            fileType: this.getFileType(fileName),
            size: buffer.length
        };

        try {
            logger.info('Starting GPT analysis', {
                fileName: fileInfo.fileName,
                fileType: fileInfo.fileType,
                size: fileInfo.size
            });

            // Let GPT analyze the file content
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `You are a file analyzer specializing in ${fileInfo.fileType} files. The content will be provided as a base64 encoded string. For PDFs, first decode the base64 content to extract the text, then analyze it. For spreadsheets, decode the content and analyze the data structure, key columns, and patterns. Provide a clear, detailed summary of the file's contents.`
                },
                {
                    role: 'user',
                    content: `This is a base64 encoded ${fileInfo.fileType} file named "${fileInfo.fileName}". Please decode and analyze its contents:\n${buffer.toString('base64')}`
                }
            ];

            let analysis = '';
            await this.openAIService.getStreamingCompletion(
                messages,
                async (content) => {
                    analysis += content;
                    logger.debug('GPT streaming response', { 
                        fileName: fileInfo.fileName,
                        contentLength: content.length 
                    });
                },
                { temperature: 0.3, maxTokens: 1000 }
            );

            logger.info('GPT analysis completed successfully', {
                fileName: fileInfo.fileName,
                analysisLength: analysis.length,
                preview: analysis.substring(0, 100) + '...'
            });

            fileInfo.preview = analysis;

            // Add the analysis to message handler's session if available
            if (this.messageHandler) {
                const conversationId = 'default'; // This should come from context
                this.messageHandler.addDocumentToSession(conversationId, analysis);
                this.messageHandler.addFileContext(conversationId, {
                    fileName,
                    fileType: fileInfo.fileType,
                    uploadTime: new Date(),
                    content: analysis
                });
                logger.info('File context added to message handler', {
                    fileName: fileInfo.fileName,
                    conversationId
                });
            }
        } catch (error) {
            logger.error('Error in GPT analysis', {
                fileName: fileInfo.fileName,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
        }

        return fileInfo;
    }

    private getFileType(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        switch (ext) {
            case 'xlsx':
            case 'xls':
                return 'Excel';
            case 'csv':
                return 'CSV';
            case 'pdf':
                return 'PDF';
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
                return 'Image';
            default:
                return 'Unknown';
        }
    }

    private createFileInfoCard(fileInfo: FileInfo): Attachment {
        logger.debug('Creating file info card', {
            fileName: fileInfo.fileName,
            fileType: fileInfo.fileType
        });

        const cardBody: any[] = [
            {
                type: 'TextBlock',
                text: `File Analysis: ${fileInfo.fileName}`,
                size: 'Large',
                weight: 'Bolder',
                wrap: true
            },
            {
                type: 'FactSet',
                facts: [
                    {
                        title: 'File Type',
                        value: fileInfo.fileType
                    },
                    {
                        title: 'Size',
                        value: `${(fileInfo.size / 1024).toFixed(2)} KB`
                    }
                ]
            }
        ];

        if (fileInfo.preview) {
            cardBody.push({
                type: 'TextBlock',
                text: 'Analysis:',
                size: 'Medium',
                weight: 'Bolder',
                wrap: true
            });

            cardBody.push({
                type: 'TextBlock',
                text: fileInfo.preview,
                wrap: true
            });
        }

        // Add suggested questions
        cardBody.push({
            type: 'TextBlock',
            text: 'You can ask me questions about this file!',
            size: 'Medium',
            weight: 'Bolder',
            wrap: true
        });

        return CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.3',
            body: cardBody
        });
    }

    public async handleFileUpload(context: TurnContext): Promise<{ success: boolean; documentId?: string; error?: string; }[]> {
        const results = [];
        
        for (const attachment of context.activity.attachments || []) {
            try {
                logger.info('Starting file upload process', {
                    fileName: attachment.name,
                    contentType: attachment.contentType
                });
                
                // Download the file
                const response = await this.downloadAttachment(attachment);
                if (!response.success || !response.buffer) {
                    logger.error('File download failed', {
                        fileName: attachment.name,
                        error: response.error
                    });
                    results.push({ success: false, error: response.error });
                    continue;
                }

                // Analyze the file using GPT
                const fileInfo = await this.analyzeFile(response.buffer, attachment.name || 'unknown');

                // Store the file
                const documentId = await this.storageService.uploadFile(
                    this.containerName,
                    fileInfo.fileName,
                    response.buffer
                );

                logger.info('File stored successfully', {
                    fileName: fileInfo.fileName,
                    documentId,
                    size: response.buffer.length
                });

                // Track active file
                this.activeFiles.add(documentId);

                // Set up file context in message handler if available
                if (this.messageHandler) {
                    const conversationId = context.activity.conversation.id;
                    this.messageHandler.addFileContext(conversationId, {
                        fileName: fileInfo.fileName,
                        fileType: fileInfo.fileType,
                        uploadTime: new Date(),
                        content: fileInfo.preview
                    });
                    logger.info('File context added', {
                        fileName: fileInfo.fileName,
                        conversationId
                    });
                }

                // Send file info card
                const card = this.createFileInfoCard(fileInfo);
                await context.sendActivity({ attachments: [card] });

                logger.info('File upload process completed', {
                    fileName: fileInfo.fileName,
                    documentId,
                    success: true
                });

                results.push({ success: true, documentId });
            } catch (error) {
                logger.error('Error in file upload process', {
                    fileName: attachment.name,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                });
                results.push({ 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                });
            }
        }

        return results;
    }

    private async downloadAttachment(attachment: any): Promise<{ success: boolean; buffer?: Buffer; error?: string; }> {
        try {
            logger.info('Downloading attachment', {
                url: attachment.contentUrl,
                name: attachment.name
            });
            
            // Get file content
            const response = await fetch(attachment.contentUrl);
            if (!response.ok) {
                throw new Error(`Failed to download: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            logger.info('Download completed', {
                name: attachment.name,
                size: buffer.length
            });

            return { success: true, buffer };
        } catch (error) {
            logger.error('Download error', {
                name: attachment.name,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Download failed' 
            };
        }
    }

    public async processFileWithQuestion(context: TurnContext, documentId: string, question: string): Promise<void> {
        try {
            logger.info('Processing file question', {
                documentId,
                question
            });

            if (!this.activeFiles.has(documentId)) {
                logger.warn('File not found in active files', { documentId });
                await context.sendActivity('File not found. Please upload the file again.');
                return;
            }

            const fileContent = await this.storageService.downloadFile(this.containerName, documentId);
            if (!fileContent) {
                logger.warn('File not found in storage', { documentId });
                await context.sendActivity('File not found. Please upload the file again.');
                return;
            }

            // Process the question with file content
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `You are analyzing a document. The content is provided as a base64 encoded string. First decode the content, then answer questions about it:\n${fileContent.toString('base64')}`
                },
                {
                    role: 'user',
                    content: question
                }
            ];

            await context.sendActivity({ type: 'typing' });
            let fullResponse = '';
            await this.openAIService.getStreamingCompletion(
                messages,
                async (content) => {
                    fullResponse += content;
                    logger.debug('GPT streaming response for question', {
                        documentId,
                        contentLength: content.length
                    });
                },
                { temperature: 0.3, maxTokens: 500 }
            );

            if (fullResponse) {
                await context.sendActivity(fullResponse);
                logger.info('Question answered successfully', {
                    documentId,
                    question,
                    responseLength: fullResponse.length
                });
            }

            // Clean up the file after processing
            await this.storageService.deleteFile(this.containerName, documentId);
            this.activeFiles.delete(documentId);
            logger.info('File cleaned up', { documentId });
        } catch (error) {
            logger.error('Error processing file question', {
                documentId,
                question,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            await context.sendActivity('Sorry, I encountered an error processing your question.');
        }
    }

    public async cleanup(): Promise<void> {
        // Clean up all active files
        for (const documentId of this.activeFiles) {
            try {
                await this.storageService.deleteFile(this.containerName, documentId);
                logger.info('File deleted during cleanup', { documentId });
            } catch (error) {
                logger.error('Error cleaning up file', {
                    documentId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        this.activeFiles.clear();
        logger.info('Cleanup completed', {
            filesCleared: this.activeFiles.size
        });
    }
}
