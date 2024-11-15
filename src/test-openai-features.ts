import { OpenAIService } from './services/OpenAIService';

async function testOpenAIFeatures() {
    const openAIService = new OpenAIService();
    console.log('OpenAI Service initialized\n');

    try {
        // 1. Test Streaming Completion
        console.log('Testing Streaming Completion:');
        console.log('Generating a story stream...');
        await openAIService.getStreamingCompletion(
            [{
                role: 'user',
                content: 'Write a very short story about a robot learning to paint.'
            }],
            (content) => process.stdout.write(content)
        );
        console.log('\n\n-------------------\n');

        // 2. Test Image Generation
        console.log('Testing Image Generation:');
        const imageUrls = await openAIService.generateImage(
            'A robot holding a paintbrush in front of an easel in a sunlit artist studio',
            { size: '512x512', n: 1 }
        );
        console.log('Generated image URLs:', imageUrls);
        console.log('\n-------------------\n');

        // 3. Test Function Calling
        console.log('Testing Function Calling:');
        interface WeatherResponse {
            location: string;
            temperature: number;
            conditions: string;
            humidity: number;
        }
        
        const weatherData = await openAIService.getFunctionCompletion<WeatherResponse>(
            [{
                role: 'user',
                content: 'What\'s the weather like in San Francisco right now?'
            }],
            'get_current_weather',
            {
                location: { 
                    type: 'string',
                    description: 'The city and state'
                },
                temperature: { 
                    type: 'number',
                    description: 'The temperature in fahrenheit'
                },
                conditions: { 
                    type: 'string',
                    description: 'The weather conditions (e.g., sunny, cloudy, rainy)'
                },
                humidity: { 
                    type: 'number',
                    description: 'The humidity percentage'
                }
            }
        );
        console.log('Structured weather data:', weatherData);
        console.log('\n-------------------\n');

        // 4. Test Embeddings
        console.log('Testing Text Embeddings:');
        const embedding = await openAIService.getEmbedding(
            'The quick brown fox jumps over the lazy dog'
        );
        console.log('Text embedding (first 5 dimensions):', embedding.slice(0, 5));
        console.log(`Total embedding dimensions: ${embedding.length}`);
        console.log('\n-------------------\n');

        // 5. Test Persona Completion
        console.log('Testing Persona Completion:');
        const pirateResponse = await openAIService.createPersonaCompletion(
            'a friendly pirate captain',
            [{
                role: 'user',
                content: 'What do you think about modern technology?'
            }]
        );
        console.log('Pirate\'s response:', pirateResponse);
        console.log('\n-------------------\n');

    } catch (error) {
        console.error('Error during feature testing:', error);
    }
}

// Run the tests
testOpenAIFeatures();
