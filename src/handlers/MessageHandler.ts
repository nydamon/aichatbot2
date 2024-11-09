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

    private async getConversationState(context: TurnContext): Promise<any> {
        // Implement the logic to get or initialize the conversation state
        // This is a placeholder implementation
        return { messageHistory: [] };
    }

    private async saveConversationState(context: TurnContext, conversationState: any): Promise<void> {
        // Implement the logic to save the conversation state
        // This is a placeholder implementation
        console.log('Conversation state saved:', conversationState);
    }

    public async getDocumentContent(documentId: string): Promise<{ content: string } | null> {
        // Implement the logic to get document content by documentId
        // For example, you can fetch the document from a database or storage service
        // Here is a placeholder implementation:
        const document = await this.searchService.getDocument(documentId);
        if (document) {
            return { content: document.content };
        }
        return null;
    }
        
    public async handleMessage(context: TurnContext): Promise<void> {
        try {
            const messageText = context.activity.text;
            const conversationState = await this.getConversationState(context);
            
            // Update message history first
            conversationState.messageHistory.push({
                role: 'user',
                content: messageText
            });

            if (this.isSOPQuery(messageText)) {
                const searchResults = await this.searchService.searchDocuments(messageText);
                await this.processSearchResults(context, searchResults, messageText);
            } else {
                // Handle as general chat query
                const response = await this.openAIService.getChatCompletion(
                    conversationState.messageHistory, 
                    conversationState.messageHistory
                );
                await context.sendActivity(response);
                
                // Add assistant's response to history
                conversationState.messageHistory.push({
                    role: 'assistant',
                    content: response
                });
            }

            await this.saveConversationState(context, conversationState);
        } catch (error) {
            console.error('Error in handleMessage:', error);
            await context.sendActivity('Sorry, I encountered an error processing your message.');
        }
    }

    private isSOPQuery(query: string): boolean {
        return this.SOP_PATTERNS.some(pattern => pattern.test(query));
    }

    private isDocumentRelatedQuery(query: string): boolean {
        // Keywords that suggest a document/SOP query
        const docKeywords = [
            'sop', 'document', 'procedure', 'policy', 'guide', 'manual',
            'how to', 'steps', 'process', 'instruction', 'documentation'
        ];
        
        const normalizedQuery = query.toLowerCase();
        return docKeywords.some(keyword => 
            normalizedQuery.includes(keyword.toLowerCase())
        );
    }


    private async processSearchResults(context: TurnContext, searchResults: SearchResultDocument[], query: string): Promise<void> {
        const options = searchResults.map(result => ({
            type: 'imBack',
            title: result.document.title,
            value: result.document.id
        }));

        if (options.length > 1) {
            await this.handleSOPInquiry(context, options);
        } else if (options.length === 1) {
            await this.handleDocumentSelection(options[0].value, context);
        } else {
        await context.sendActivity('No relevant documents found.');
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
