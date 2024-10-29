"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsBot = void 0;
const botbuilder_1 = require("botbuilder");
const openai_1 = require("@azure/openai");
const config_1 = __importDefault(require("./config"));
class TeamsBot extends botbuilder_1.ActivityHandler {
    constructor() {
        super();
        // Initialize OpenAI client
        const endpoint = config_1.default.azureOpenAI?.endpoint;
        const apiKey = config_1.default.azureOpenAI?.apiKey;
        if (!endpoint || !apiKey) {
            throw new Error('Azure OpenAI endpoint or API key not configured');
        }
        this.client = new openai_1.OpenAIClient(endpoint, new openai_1.AzureKeyCredential(apiKey));
        // Register message handler
        this.onMessage(async (context) => {
            console.log('Message received:', context.activity);
            await this.handleIncomingMessage(context);
        });
        // Register members added handler
        this.onMembersAdded(async (context) => {
            await this.handleMembersAdded(context);
        });
    }
    // Add run method
    async run(context) {
        await super.run(context);
    }
    async handleIncomingMessage(context) {
        try {
            const userMessage = context.activity.text;
            if (!userMessage) {
                await context.sendActivity("I received an empty message. Please send some text.");
                return;
            }
            // Create properly typed messages array
            const systemMessage = {
                role: "system",
                content: `You are a helpful AI assistant integrated into Microsoft Teams. Your role is to help users by providing accurate and relevant information.`,
                name: "system"
            };
            const userMsg = {
                role: "user",
                content: userMessage,
                name: "user"
            };
            const messages = [systemMessage, userMsg];
            console.log('Preparing OpenAI request:', {
                messageCount: messages.length,
                systemMessageLength: systemMessage.content.length,
                userMessageLength: userMsg.content.length
            });
            const deploymentName = config_1.default.azureOpenAI?.deploymentName;
            if (!deploymentName) {
                throw new Error('Azure OpenAI deployment name not configured');
            }
            const response = await this.client.getChatCompletions(deploymentName, messages, {
                maxTokens: 800,
                temperature: 0.7,
                topP: 0.95,
                frequencyPenalty: 0,
                presencePenalty: 0,
            });
            const responseMessage = response.choices[0]?.message?.content;
            if (!responseMessage) {
                throw new Error('No response content from OpenAI');
            }
            const formattedResponse = this.formatResponseForTeams(responseMessage);
            await context.sendActivity(formattedResponse);
        }
        catch (error) {
            console.error('Error in handleIncomingMessage:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            await context.sendActivity(`I'm sorry, I encountered an error: ${errorMessage}. Please try again.`);
        }
    }
    formatResponseForTeams(response) {
        let formattedResponse = response;
        // Format code blocks
        formattedResponse = formattedResponse.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (_, language, code) => {
            return `\`\`\`${language || ''}\n${code.trim()}\n\`\`\``;
        });
        // Format bullet points
        formattedResponse = formattedResponse.replace(/^\s*[-*]\s/gm, '\n• ');
        // Format numbered lists
        formattedResponse = formattedResponse.replace(/^\s*(\d+\.)\s/gm, '\n$1 ');
        // Format headers
        formattedResponse = formattedResponse.replace(/^(#{1,6})\s(.+)$/gm, '\n$1 $2\n');
        // Clean up excessive newlines
        formattedResponse = formattedResponse.replace(/\n{3,}/g, '\n\n');
        return formattedResponse.trim();
    }
    async handleMembersAdded(context) {
        const welcomeText = `👋 Hello! I'm your AI assistant integrated with Microsoft Teams. I can help you with:

• Answering questions
• Providing explanations and clarifications
• Offering assistance and guidance

Feel free to ask me anything! How can I help you today?`;
        const membersAdded = context.activity.membersAdded;
        if (!membersAdded)
            return;
        for (const member of membersAdded) {
            if (member.id !== context.activity.recipient.id) {
                await context.sendActivity(welcomeText);
            }
        }
    }
}
exports.TeamsBot = TeamsBot;
//# sourceMappingURL=teamsBot.js.map