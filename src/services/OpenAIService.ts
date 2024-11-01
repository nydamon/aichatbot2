import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
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

            // Log successful initialization
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
            const completion = await this.client.getChatCompletions(
                azureOpenAIConfig.deploymentName,
                messages,
                {
                    temperature: options.temperature ?? 0.7,
                    maxTokens: options.maxTokens ?? 800
                }
            );

            return completion.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('Error in OpenAI completion:', error);
            throw new Error('Failed to get chat completion');
        }
    }
}
