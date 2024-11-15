import { CardFactory, TurnContext } from 'botbuilder';
import { OpenAIService } from '../services/OpenAIService';
import { SearchService } from '../services/SearchService';
import { ChatMessage } from '../types/ChatTypes';

interface FileContext {
    fileName: string;
    fileType: string;
    uploadTime: Date;
    content?: string;
}

export class MessageHandler {
    private openAIService: OpenAIService;
    private searchService: SearchService;
    private sessionDocuments: Map<string, string> = new Map();
    private fileContexts: Map<string, FileContext> = new Map();
    
    constructor(searchService: SearchService, openAIService: OpenAIService) {
        this.searchService = searchService;
        this.openAIService = openAIService;
    }

    public addFileContext(conversationId: string, context: FileContext): void {
        this.fileContexts.set(conversationId, context);
    }

    public addDocumentToSession(conversationId: string, content: string): void {
        const existingContent = this.sessionDocuments.get(conversationId) || '';
        this.sessionDocuments.set(conversationId, existingContent + '\n\n' + content);
    }

    public clearSessionDocuments(conversationId: string): void {
        this.sessionDocuments.delete(conversationId);
        this.fileContexts.delete(conversationId);
    }

    public async handleMessage(context: TurnContext): Promise<void> {
        try {
            const messageText = context.activity.text || '';
            const conversationId = context.activity.conversation.id;
            
            if (!messageText.trim()) {
                await context.sendActivity('I received an empty message. Please provide some text.');
                return;
            }

            const fileContext = this.fileContexts.get(conversationId);
            const sessionContent = this.sessionDocuments.get(conversationId);

            // Build system message with context
            let systemContent = 'You are a helpful assistant.';
            if (fileContext) {
                systemContent = `You are an AI assistant helping with document analysis. 
                    Context: User has uploaded a ${fileContext.fileType} file named "${fileContext.fileName}".
                    ${sessionContent ? `The file contains:\n${sessionContent}` : ''}
                    Please provide specific answers about this file.`;
            }

            const messages: ChatMessage[] = [
                { 
                    role: 'system', 
                    content: systemContent
                }
            ];

            // Add file-specific context to the user's question
            let enhancedQuestion = messageText;
            if (fileContext) {
                if (messageText.toLowerCase().includes('row') || messageText.toLowerCase().includes('column')) {
                    enhancedQuestion = `Regarding the ${fileContext.fileType} file "${fileContext.fileName}": ${messageText}`;
                } else if (messageText.match(/^how many|^what is|^show me|^tell me/i)) {
                    enhancedQuestion = `Analyzing the ${fileContext.fileType} file "${fileContext.fileName}": ${messageText}`;
                }
            }

            messages.push({ role: 'user', content: enhancedQuestion });

            // Use streaming for real-time responses
            await context.sendActivity({ type: 'typing' });
            let fullResponse = '';
            await this.openAIService.getStreamingCompletion(
                messages,
                async (content) => {
                    fullResponse += content;
                },
                {
                    temperature: 0.3,
                    maxTokens: 500
                }
            );

            if (fullResponse) {
                await context.sendActivity(fullResponse);
            }

        } catch (error) {
            console.error('Error in handleMessage:', error instanceof Error ? error.message : String(error));
            await context.sendActivity('Sorry, I encountered an error processing your message.');
        }
    }
}
