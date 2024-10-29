import { ActivityHandler, TurnContext, MessageFactory } from 'botbuilder';
import { OpenAIClient, AzureKeyCredential, ChatRequestMessage } from '@azure/openai';
import config from './config';

export class TeamsBot extends ActivityHandler {
    private client: OpenAIClient;
    private conversationHistory: Map<string, ChatRequestMessage[]>;
    private readonly MAX_HISTORY_LENGTH = 10;

    constructor() {
        super();
        this.conversationHistory = new Map();

        const endpoint = config.azureOpenAI?.endpoint;
        const apiKey = config.azureOpenAI?.apiKey;

        if (!endpoint || !apiKey) {
            throw new Error('Azure OpenAI endpoint or API key not configured');
        }

        this.client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));

        this.onMessage(async (context: TurnContext) => {
            console.log('Message received:', context.activity);

            // Handle button clicks
            if (context.activity.value) {
                const value = context.activity.value;
                if (value.command === 'start') {
                    await context.sendActivity(this.createSuggestedActions([
                        'Tell me about yourself',
                        'What can you help me with?',
                        '/help'
                    ]));
                    return;
                }
            }

            // Show typing indicator
            await this.sendTypingIndicator(context);
            
            const isCommand = await this.handleCommands(context);
            if (!isCommand) {
                await this.handleIncomingMessage(context);
            }
        });

        this.onMembersAdded(async (context: TurnContext) => {
            await this.handleMembersAdded(context);
        });
    }

    async run(context: TurnContext) {
        await super.run(context);
    }

    private async sendTypingIndicator(context: TurnContext): Promise<void> {
        const typingActivity = {
            type: 'typing',
            relatesTo: context.activity.relatesTo,
        };
        await context.sendActivity(typingActivity);
    }

    private createSuggestedActions(suggestions: string[]): any {
        return MessageFactory.suggestedActions(
            suggestions,
            'Here are some suggestions:'
        );
    }

    private async handleIncomingMessage(context: TurnContext): Promise<void> {
        try {
            const userMessage = context.activity.text;
            if (!userMessage) {
                await context.sendActivity("I received an empty message. Please send some text.");
                return;
            }

            const conversationId = context.activity.conversation.id;
            
            if (!this.conversationHistory.has(conversationId)) {
                this.conversationHistory.set(conversationId, []);
            }
            
            const currentHistory = this.conversationHistory.get(conversationId)!;

            const systemMessage: ChatRequestMessage = {
                role: "system",
                content: `You are a helpful AI assistant integrated into Microsoft Teams. Your role is to help users by providing accurate and relevant information.`,
                name: "system"
            };

            const userMsg: ChatRequestMessage = {
                role: "user",
                content: userMessage,
                name: "user"
            };

            currentHistory.push(userMsg);

            const messages: ChatRequestMessage[] = [
                systemMessage,
                ...currentHistory.slice(-this.MAX_HISTORY_LENGTH)
            ];

            const deploymentName = config.azureOpenAI?.deploymentName;
            if (!deploymentName) {
                throw new Error('Azure OpenAI deployment name not configured');
            }

            const response = await this.client.getChatCompletions(
                deploymentName,
                messages,
                {
                    maxTokens: 800,
                    temperature: 0.7,
                    topP: 0.95,
                    frequencyPenalty: 0,
                    presencePenalty: 0,
                }
            );

            const responseMessage = response.choices[0]?.message?.content || '';

            currentHistory.push({
                role: "assistant",
                content: responseMessage,
                name: "assistant"
            });

            this.conversationHistory.set(conversationId, currentHistory);

            await context.sendActivity(this.formatResponseForTeams(responseMessage));

            // Show suggestions less frequently (30% chance)
            if (Math.random() < 0.3) {
                const suggestions = this.generateContextualSuggestions();
                await context.sendActivity(this.createSuggestedActions(suggestions));
            }

        } catch (error: unknown) {
            console.error('Error in handleIncomingMessage:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            await context.sendActivity(
                `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`
            );
        }
    }

    private generateContextualSuggestions(): string[] {
        return [
            'Tell me more',
            'Can you explain that differently?',
            '/help'
        ];
    }

    private async handleMembersAdded(context: TurnContext): Promise<void> {
        const welcomeText = `👋 Hello! I'm your AI assistant integrated with Microsoft Teams. I can help you with:

- Answering questions
- Providing explanations and clarifications
- Offering assistance and guidance

Available commands:
- /help - Show available commands
- /clear - Clear conversation history
- /history - Show conversation history

Feel free to ask me anything! How can I help you today?`;

        const membersAdded = context.activity.membersAdded;
        if (!membersAdded) return;

        for (const member of membersAdded) {
            if (member.id !== context.activity.recipient.id) {
                await context.sendActivity(welcomeText);
                await context.sendActivity(this.createSuggestedActions([
                    'Tell me about yourself',
                    'What can you help me with?',
                    '/help'
                ]));
            }
        }
    }

    private formatResponseForTeams(response: string): string {
        let formattedResponse = response;
        formattedResponse = formattedResponse.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (_, language, code) => {
            return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
        });
        formattedResponse = formattedResponse.replace(/^\s*[-*]\s/gm, '\n- ');
        formattedResponse = formattedResponse.replace(/^\s*(\d+\.)\s/gm, '\n$1 ');
        formattedResponse = formattedResponse.replace(/^(#{1,6})\s(.+)$/gm, '\n$1 $2\n');
        formattedResponse = formattedResponse.replace(/\n{3,}/g, '\n\n');
        return formattedResponse.trim();
    }

    private clearHistory(conversationId: string): void {
        this.conversationHistory.set(conversationId, []);
    }

    private getHistory(conversationId: string): ChatRequestMessage[] {
        return this.conversationHistory.get(conversationId) || [];
    }

    private async handleCommands(context: TurnContext): Promise<boolean> {
        const message = context.activity?.text;
        if (!message) return false;
        
        const messageText = message.toLowerCase();
        const conversationId = context.activity.conversation.id;

        switch (messageText) {
            case '/clear':
                this.clearHistory(conversationId);
                await context.sendActivity('Conversation history cleared! How can I help you?');
                return true;

            case '/help':
                const helpText = `Available commands:
- /help - Show this help message
- /clear - Clear conversation history
- /history - Show conversation history

You can also ask me questions or request assistance with any topic!`;
                await context.sendActivity(helpText);
                return true;

            case '/history':
                const history = this.getHistory(conversationId);
                const historyText = history
                    .map(msg => `${msg.role}: ${msg.content}`)
                    .join('\n\n');
                await context.sendActivity(historyText || 'No conversation history yet.');
                return true;

            default:
                return false;
        }
    }
}