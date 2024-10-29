"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsBot = void 0;
const botbuilder_1 = require("botbuilder");
const openai_1 = require("@azure/openai");
const search_documents_1 = require("@azure/search-documents");
const config_1 = __importDefault(require("./config"));
class TeamsBot extends botbuilder_1.ActivityHandler {
    constructor() {
        super();
        console.log('Initializing TeamsBot with configuration:', {
            openai: {
                endpoint: config_1.default.azureOpenAI?.endpoint,
                hasApiKey: !!config_1.default.azureOpenAI?.apiKey,
                deploymentName: config_1.default.azureOpenAI?.deploymentName
            },
            search: {
                endpoint: config_1.default.azureSearch?.endpoint,
                indexName: config_1.default.azureSearch?.indexName,
                hasApiKey: !!config_1.default.azureSearch?.apiKey
            }
        });
        // Initialize OpenAI client
        if (!config_1.default.azureOpenAI?.endpoint || !config_1.default.azureOpenAI?.apiKey) {
            console.error('Missing OpenAI configuration');
            throw new Error('Azure OpenAI credentials not properly configured');
        }
        this.client = new openai_1.OpenAIClient(config_1.default.azureOpenAI.endpoint, new openai_1.AzureKeyCredential(config_1.default.azureOpenAI.apiKey));
        // Initialize Search client
        if (!config_1.default.azureSearch?.endpoint || !config_1.default.azureSearch?.indexName || !config_1.default.azureSearch?.apiKey) {
            console.error('Missing Search configuration');
            throw new Error('Azure Cognitive Search credentials not properly configured');
        }
        this.searchClient = new search_documents_1.SearchClient(config_1.default.azureSearch.endpoint, config_1.default.azureSearch.indexName, new search_documents_1.AzureKeyCredential(config_1.default.azureSearch.apiKey));
        // Register message handler
        this.onMessage(async (context) => {
            console.log('Message received:', {
                text: context.activity.text,
                from: context.activity.from,
                conversation: context.activity.conversation,
                timestamp: context.activity.timestamp
            });
            await this.handleIncomingMessage(context);
        });
        // Register members added handler
        this.onMembersAdded(async (context) => {
            console.log('Members added event received');
            await this.handleMembersAdded(context);
        });
    }
    async handleIncomingMessage(context) {
        const userMessage = context.activity.text || '';
        console.log('Processing message:', userMessage);
        try {
            // Search for relevant documents
            console.log('Starting cognitive search for:', userMessage);
            const searchResults = await this.searchClient.search(userMessage, {
                queryType: 'simple',
                select: ['content'],
                top: 5,
                searchFields: ['content']
            });
            console.log('Search results count:', searchResults.count);
            // Compile context from search results
            let contextText = '';
            for await (const result of searchResults.results) {
                if (result.document.content) {
                    contextText += result.document.content + '\n';
                }
            }
            console.log('Context text length:', contextText.length);
            console.log('First 100 chars of context:', contextText.substring(0, 100));
            // Prepare messages for OpenAI
            const messages = [
                {
                    role: "system",
                    content: `You are a helpful AI assistant integrated into Microsoft Teams. Your role is to help users by providing accurate and relevant information.
                    
If you find relevant information in the provided context, use it to inform your response. If you don't find relevant information in the context, you can still provide a helpful response based on your general knowledge.

Always maintain a professional and friendly tone, and format your responses in a clear and readable way.

When dealing with technical information:
- Provide clear explanations
- Use examples when helpful
- Break down complex concepts
- Highlight important points
- Include relevant caveats or limitations

If you're not sure about something, be honest about your limitations and suggest alternative resources or approaches.`
                },
                {
                    role: "user",
                    content: `Context from knowledge base:\n${contextText}\n\nUser Question: ${userMessage}`
                }
            ];
            console.log('Preparing OpenAI request with messages structure:', {
                messageCount: messages.length,
                systemMessageLength: messages[0].content.length,
                userMessageLength: messages[1].content.length
            });
            // Get deployment name
            const deploymentName = config_1.default.azureOpenAI?.deploymentName;
            if (!deploymentName) {
                throw new Error('Azure OpenAI deployment name not configured');
            }
            console.log('Using OpenAI deployment:', deploymentName);
            // Get completion from OpenAI
            console.log('Sending request to OpenAI');
            const response = await this.client.getChatCompletions(deploymentName, messages, {
                maxTokens: 800,
                temperature: 0.7,
                topP: 0.95,
                frequencyPenalty: 0,
                presencePenalty: 0,
            });
            console.log('Received response from OpenAI:', {
                choicesCount: response.choices?.length,
                hasContent: !!response.choices?.[0]?.message?.content
            });
            if (response.choices && response.choices.length > 0) {
                const messageContent = response.choices[0].message?.content;
                console.log('Generated content length:', messageContent?.length || 0);
                if (messageContent) {
                    const formattedResponse = this.formatResponseForTeams(messageContent);
                    console.log('Sending formatted response to Teams');
                    await context.sendActivity(formattedResponse);
                    await this.logConversation(context, formattedResponse);
                    console.log('Response sent successfully');
                }
                else {
                    console.warn('No content in OpenAI response');
                    await context.sendActivity("I'm sorry, I couldn't generate a response.");
                }
            }
            else {
                console.warn('No choices in OpenAI response');
                await context.sendActivity("I'm sorry, I couldn't generate a response.");
            }
        }
        catch (err) {
            console.error('Error in handleIncomingMessage:', {
                name: err.name,
                message: err.message,
                stack: err.stack,
                response: err.response?.data || err.response,
                status: err.status || err.statusCode,
                headers: err.headers,
            });
            await context.sendActivity("I'm sorry, I encountered an error while processing your message. " +
                "Please try again or contact support if the issue persists.");
            throw err;
        }
    }
    formatResponseForTeams(response) {
        console.log('Formatting response for Teams');
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
        console.log('Processing members added event');
        const membersAdded = context.activity.membersAdded;
        const welcomeText = `👋 Hello! I'm your AI assistant integrated with Microsoft Teams. I can help you with:

• Answering questions about our documentation and knowledge base
• Providing explanations and clarifications
• Offering technical assistance and guidance

Feel free to ask me anything! How can I help you today?`;
        for (const member of membersAdded || []) {
            if (member.id !== context.activity.recipient.id) {
                console.log('Sending welcome message to new member:', member.id);
                await context.sendActivity(welcomeText);
            }
        }
    }
    checkMessageType(context) {
        const activity = context.activity;
        if (activity.conversation.conversationType === 'personal') {
            return 'direct';
        }
        else if (activity.conversation.conversationType === 'channel') {
            return 'channel';
        }
        return 'unknown';
    }
    isUserMessage(context) {
        return context.activity.type === 'message' && !!context.activity.text;
    }
    async logConversation(context, responseText) {
        try {
            const timestamp = new Date().toISOString();
            const userMessage = context.activity.text || '';
            const userId = context.activity.from.id;
            const conversationType = this.checkMessageType(context);
            console.log('Conversation log:', {
                timestamp,
                userId,
                conversationType,
                userMessage,
                botResponse: responseText,
            });
        }
        catch (err) {
            console.error('Error logging conversation:', err instanceof Error ? err.message : err);
        }
    }
}
exports.TeamsBot = TeamsBot;
//# sourceMappingURL=teamsBot_working_old.js.map