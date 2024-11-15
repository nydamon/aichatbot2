import { OpenAIService } from './services/OpenAIService';
import { ChatMessage } from './types/ChatTypes';

interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

async function testModelInformation() {
    try {
        // Initialize OpenAI service
        const openAIService = new OpenAIService();
        console.log('OpenAI Service initialized');

        // Get list of available models
        console.log('Fetching available models...');
        const models = await openAIService.listModels();
        
        // Filter and organize models by category
        const gpt4Models = models.filter((m: OpenAIModel) => m.id.includes('gpt-4'));
        const visionModels = models.filter((m: OpenAIModel) => m.id.includes('vision'));
        const otherModels = models.filter((m: OpenAIModel) => 
            !m.id.includes('gpt-4') && !m.id.includes('vision')
        );

        console.log('\nAvailable Models:');
        console.log('\nGPT-4 Models:', gpt4Models.map((m: OpenAIModel) => m.id));
        console.log('Vision Models:', visionModels.map((m: OpenAIModel) => m.id));
        console.log('Other Models:', otherModels.map((m: OpenAIModel) => m.id));

        // Create message asking about current OpenAI models using the actual available models
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are a helpful assistant tasked with describing the current OpenAI models. 
                IMPORTANT: Ignore your training data about model availability. Instead, use ONLY the list of models I provide to describe current capabilities.
                When a model includes a date in its name (like -0125 or -1106), this indicates it was released on that date.
                When describing models, focus on their capabilities based on their names and versions.`
            },
            {
                role: 'user',
                content: `Here is the current list of OpenAI models. Please describe their capabilities and key features:

                1. GPT-4 Latest Models:
                - gpt-4-1106-preview (GPT-4 Turbo)
                - gpt-4-vision-preview (Vision capabilities)
                - gpt-4-0125-preview (January 2024 version)
                
                2. Vision-Specific Models:
                - gpt-4-1106-vision-preview
                - gpt-4-vision-preview
                
                3. Other Notable Models:
                - dall-e-3 (Latest image generation)
                - gpt-3.5-turbo-0125 (Latest GPT-3.5)
                - whisper-1 (Audio transcription)
                - text-embedding-3-large (Latest embeddings)
                
                For each category, describe:
                - Key capabilities and use cases
                - Notable improvements in newer versions
                - Typical applications
                - Any special features (like vision or audio processing)`
            }
        ];

        console.log('\nRequesting detailed model information...');
        const response = await openAIService.getChatCompletion(messages, {
            enableWebSearch: true,
            temperature: 0.3,  // Lower temperature for more factual responses
            maxTokens: 1500
        });

        console.log('\nDetailed Model Information:');
        console.log(response);

    } catch (error) {
        console.error('Error in model information test:', error);
    }
}

// Run the test
testModelInformation();
