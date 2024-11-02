import { TurnContext } from 'botbuilder';
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
        
        if (this.isSopInquiry(messageText)) {
            await this.handleSopInquiry(messageText, context);
        } else {
            await this.handleGeneralQuery(context, history);
        }
    }

    private isSopInquiry(message: string): boolean {
        return this.SOP_PATTERNS.some(pattern => pattern.test(message));
    }

    async handleSopInquiry(query: string, context: TurnContext): Promise<void> {
        try {
            console.log('Searching documents with query:', query);
            const searchResults = await this.searchService.searchDocuments(query);
            
            if (!searchResults || searchResults.length === 0) {
                await context.sendActivity("I couldn't find any relevant documents for your query.");
                return;
            }

            const response = this.formatSearchResults(searchResults);
            await context.sendActivity(response);
            
        } catch (error) {
            console.error('Error handling SOP inquiry:', error);
            throw error;
        }
    }

    private extractSearchQuery(message: string): string {
        return message
            .toLowerCase()
            .replace(/do we have (a |an )?sop on/i, '')
            .replace(/how do i/i, '')
            .replace(/can (i|we|you)/i, '')
            .replace(/is there (a |an )?procedure for/i, '')
            .replace(/what( is|'s) the process for/i, '')
            .replace(/where can i find/i, '')
            .trim();
    }

    private async requestClarification(context: TurnContext): Promise<void> {
        const clarificationQuestions = [
            "Could you please specify what kind of procedure or process you're looking for?",
            "What specific task or process do you need information about?",
            "Could you provide more details about what you're trying to accomplish?"
        ];

        const randomQuestion = clarificationQuestions[Math.floor(Math.random() * clarificationQuestions.length)];
        await context.sendActivity(randomQuestion);
    }

    private formatSearchResults(documents: SearchResultDocument[]): string {
        return documents.map(doc => {
            const preview = doc.document.content?.substring(0, 200) ?? 'No content available';
            return `📄 **Document**: ${doc.document.title ?? 'Untitled'}\n${preview}...\n\n`;
        }).join('---\n');
    }

    private async handleGeneralQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const response = await this.openAIService.getChatCompletion(history);
        await context.sendActivity(response);
    }
}
