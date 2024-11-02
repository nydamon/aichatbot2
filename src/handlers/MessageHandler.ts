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
            await this.handleSopInquiry(context, messageText);
        } else {
            await this.handleGeneralQuery(context, history);
        }
    }

    private isSopInquiry(message: string): boolean {
        return this.SOP_PATTERNS.some(pattern => pattern.test(message));
    }

    private async handleSopInquiry(context: TurnContext, message: string): Promise<void> {
        try {
            const query = this.extractSearchQuery(message);

            if (!query) {
                await this.requestClarification(context);
                return;
            }

            const searchResults = await this.searchService.searchDocuments(query, {
                top: 3
            });

            if (!searchResults.results || searchResults.results.length === 0) {
                await context.sendActivity(
                    "I couldn't find any specific SOPs or procedures for that. " +
                    "Could you please rephrase your question or provide more details?"
                );
                return;
            }

            const response = this.formatSearchResults(searchResults.results);
            await context.sendActivity(response);

        } catch (error) {
            console.error('Error handling SOP inquiry:', error);
            await context.sendActivity("I encountered an error while searching for procedures. Please try again.");
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

    private formatSearchResults(results: SearchResultDocument[]): string {
        let response = "Here's what I found:\n\n";
        
        results.forEach((result, index) => {
            const doc = result.document;
            response += `${index + 1}. ${doc.title || 'Document'}\n`;
            if (doc.category) response += `Category: ${doc.category}\n`;
            if (doc.content) {
                const excerpt = doc.content.substring(0, 150) + '...';
                response += `Summary: ${excerpt}\n`;
            }
            response += '\n';
        });

        response += "\nWould you like more specific information about any of these procedures?";
        return response;
    }

    private async handleGeneralQuery(context: TurnContext, history: ChatMessage[]): Promise<void> {
        const response = await this.openAIService.getChatCompletion(history);
        await context.sendActivity(response);
    }
}
