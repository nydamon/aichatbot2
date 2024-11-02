import { OpenAIClient, AzureKeyCredential, ChatRequestMessage } from '@azure/openai';
import { ChatMessage, ChatCompletionOptions } from '../types/ChatTypes';
import { azureOpenAIConfig } from '../config/azure-config';

export class OpenAIService {
    private client: OpenAIClient;

    constructor() {
        try {
            if (!azureOpenAIConfig.endpoint || !azureOpenAIConfig.apiKey || !azureOpenAIConfig.deploymentName) {
                throw new Error('Azure OpenAI configuration missing. Please check your environment variables.');
            }

            this.client = new OpenAIClient(
                azureOpenAIConfig.endpoint,
                new AzureKeyCredential(azureOpenAIConfig.apiKey)
            );

            console.log('OpenAIService initialized successfully');
        } catch (error) {
            console.error('Error initializing OpenAIService:', error);
            throw error;
        }
    }

    async getChatCompletion(
        messages: ChatMessage[],
        options: ChatCompletionOptions = {}
    ): Promise<string> {
        try {
            // Convert messages to the correct format
            const formattedMessages: ChatRequestMessage[] = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            console.log('Sending request to OpenAI with deployment:', azureOpenAIConfig.deploymentName);
            console.log('Messages:', JSON.stringify(formattedMessages, null, 2));

            const completion = await this.client.getChatCompletions(
                azureOpenAIConfig.deploymentName,
                formattedMessages,
                {
                    temperature: options.temperature ?? 0.7,
                    maxTokens: options.maxTokens ?? 800
                }
            );

            if (!completion.choices[0]?.message?.content) {
                throw new Error('No completion content received');
            }

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI completion error:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to fetch completion: ${error.message}`);
            } else {
                throw new Error('Failed to fetch completion: Unknown error');
            }
        }
    }
}
