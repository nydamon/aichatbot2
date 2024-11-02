import { CardFactory, TurnContext } from 'botbuilder';
import { SearchService } from '../services/SearchService';
import { OpenAIService } from '../services/OpenAIService';
import { ChatMessage } from '../types/ChatTypes';
import { SearchResultDocument } from '../types/SearchTypes';

export class MessageHandler {
    private searchService: SearchService;
    private openAIService: OpenAIService;
    
    private readonly SOP_PATTERNS = [
        /do we have (a |an )?sop on/i,
        /how do i/i,
        /can (i|we|you)/i,
        /is there (a |an )?procedure for/i,
        /what( is|'s) the process for/i,
        /where can i find/i
    ];

    constructor(searchService: SearchService, openAIService: OpenAIService) {
        this.searchService = searchService;
        this.openAIService = openAIService;
    }

    async handleMessage(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const messageText = context.activity.text || '';
        const value = context.activity.value;

        if (value && value.id) {
            await this.handleDocumentSelection(value.id, context);
            return;
        }

        const searchResults = await this.searchService.searchDocuments(messageText);

        if (!searchResults || searchResults.length === 0) {
            await context.sendActivity("I couldn't find any relevant documents for your query.");
            return;
        }

        if (searchResults.length === 1) {
            const response = this.formatSearchResults(searchResults);
            await context.sendActivity(response);
        } else {
            interface DocumentOption {
                type: string;
                title: string;
                value: { id: string };
                text: string;
            }

            const options: DocumentOption[] = searchResults.map((result: SearchResultDocument, index: number): DocumentOption => ({
                type: 'messageBack',
                title: result.document.title || `Document ${index + 1}`,
                value: { id: result.document.id },
                text: `Show document ${index + 1}`
            }));

            console.log('Options:', options);

            await this.handleSOPInquiry(context, options);
        }
    }

    private async handleDocumentSelection(documentId: string, context: TurnContext): Promise<void> {
        try {
            const document = await this.searchService.getDocument(documentId);
            if (document) {
                const preview = document.content ?? 'No content available';
                let response = `📄 **Document**: ${document.title}\n\n${this.formatContent(preview)}\n\n`;
                
                if (document.url) {
                    response += `📄 **Source**: [Link to document](${document.url})\n\n`;
                }

                await context.sendActivity(response);
            } else {
                await context.sendActivity('Document not found.');
            }
        } catch (error) {
            console.error('Error handling document selection:', error);
            throw error;
        }
    }

    private formatSearchResults(documents: SearchResultDocument[]): string {
        return documents.map(doc => {
            const preview = doc.document.content ?? 'No content available';
            return `📄 **Document**: ${doc.document.title}\n\n${this.formatContent(preview)}\n\n`;
        }).join('---\n');
    }

    private formatContent(content: string): string {
        // Format the content using Markdown
        return content
            .replace(/===(.*?)===/g, '### $1') // Convert === headings to ### headings
            .replace(/---/g, '---') // Convert --- to horizontal rules
            .replace(/\*\*(.*?)\*\*/g, '**$1**') // Bold text
            .replace(/_(.*?)_/g, '_$1_') // Italic text
            .replace(/!\[(.*?)\]\((.*?)\)/g, '![$1]($2)') // Images
            .replace(/\n/g, '\n\n') // Ensure new lines are properly formatted
            .replace(/###/g, '###'); // Ensure headings are properly formatted
    }

    private async handleGeneralQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const response = await this.openAIService.getChatCompletion(history);
        await context.sendActivity(response);
    }

    private async handleSOPInquiry(context: TurnContext, options: any[]): Promise<void> {
        try {
            const card = CardFactory.heroCard(
                'I found multiple documents. Please select one:',
                undefined,
                options
            );

            await context.sendActivity({ attachments: [card] });
        } catch (error) {
            console.error('Error handling SOP inquiry:', error);
            throw error;
        }
    }
}
