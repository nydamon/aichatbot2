import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { SearchClient, AzureKeyCredential as SearchKeyCredential } from '@azure/search-documents';
import * as configModule from './config';

// Define the expected structure of the config object
interface Config {
    azureOpenAIEndpoint: string;
    azureOpenAIKey: string;
    azureSearchEndpoint: string;
    azureSearchIndexName: string;
    azureSearchKey: string;
}

// Use type assertion to tell TypeScript the structure of configModule
const config = configModule as unknown as Config;

interface SearchDocument {
    content: string;
    [key: string]: unknown;
}

async function testAzureServices() {
    console.log('Starting Azure services test...\n');

    // Test 1: Configuration Validation
    console.log('1. Validating Configuration...');
    try {
        validateConfig();
        console.log('✅ Configuration validation passed\n');
    } catch (error) {
        console.error('❌ Configuration validation failed:', error);
        return;
    }

    // Test 2: OpenAI Connection
    console.log('2. Testing Azure OpenAI connection...');
    try {
        const openAIClient = new OpenAIClient(
            config.azureOpenAIEndpoint,
            new AzureKeyCredential(config.azureOpenAIKey)
        );
        console.log('✅ Azure OpenAI connection established\n');
    } catch (error) {
        console.error('❌ Azure OpenAI connection failed:', error);
        return;
    }

    // Test 3: Search Service Connection
    console.log('3. Testing Azure Search Service connection...');
    try {
        const searchClient = new SearchClient(
            config.azureSearchEndpoint,
            config.azureSearchIndexName,
            new SearchKeyCredential(config.azureSearchKey)
        );
        console.log('✅ Azure Search Service connection established\n');
    } catch (error) {
        console.error('❌ Azure Search Service connection failed:', error);
    }
}

// Assuming validateConfig is defined elsewhere
function validateConfig() {
    if (!config.azureOpenAIEndpoint || !config.azureOpenAIKey) {
        throw new Error('Azure OpenAI configuration is missing.');
    }
    if (!config.azureSearchEndpoint || !config.azureSearchIndexName || !config.azureSearchKey) {
        throw new Error('Azure Search Service configuration is missing.');
    }
}

// Run the test function
testAzureServices();