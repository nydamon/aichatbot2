import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { SearchClient, AzureKeyCredential as SearchKeyCredential } from '@azure/search-documents';
import config from './config';

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
    console.log('2. Testing Azure OpenAI Connection...');
    try {
        const openAIClient = new OpenAIClient(
            config.azureOpenAI.endpoint!,
            new AzureKeyCredential(config.azureOpenAI.apiKey!)
        );
        
        const testResponse = await openAIClient.getChatCompletions(
            config.azureOpenAI.deploymentName!,
            [{ role: "user", content: "Test connection. Respond with 'Connected'." }],
            { maxTokens: 50 }
        );
        
        console.log('OpenAI Response:', testResponse.choices[0]?.message?.content);
        console.log('✅ Azure OpenAI connection successful\n');
    } catch (error) {
        console.error('❌ Azure OpenAI connection failed:', error);
        return;
    }

    // Test 3: Cognitive Search Connection
    console.log('3. Testing Azure Cognitive Search Connection...');
    try {
        const searchClient = new SearchClient<SearchDocument>(
            config.azureSearch.endpoint!,
            config.azureSearch.indexName!,
            new SearchKeyCredential(config.azureSearch.apiKey!)
        );

        const searchResults = await searchClient.search('test', {
            top: 1,
            select: ['content']
        });

        let resultCount = 0;
        for await (const result of searchResults.results) {
            resultCount++;
            console.log('Sample document content:', result.document.content?.substring(0, 100) + '...');
        }
        
        console.log(`Found ${resultCount} results`);
        console.log('✅ Azure Cognitive Search connection successful\n');
    } catch (error) {
        console.error('❌ Azure Cognitive Search connection failed:', error);
        return;
    }

    console.log('All tests completed!\n');
}

function validateConfig() {
    // OpenAI Configuration
    if (!config.azureOpenAI?.endpoint) throw new Error('Missing Azure OpenAI endpoint');
    if (!config.azureOpenAI?.apiKey) throw new Error('Missing Azure OpenAI API key');
    if (!config.azureOpenAI?.deploymentName) throw new Error('Missing Azure OpenAI deployment name');

    // Search Configuration
    if (!config.azureSearch?.endpoint) throw new Error('Missing Azure Cognitive Search endpoint');
    if (!config.azureSearch?.apiKey) throw new Error('Missing Azure Cognitive Search API key');
    if (!config.azureSearch?.indexName) throw new Error('Missing Azure Cognitive Search index name');
}

// Run the tests
testAzureServices().catch(console.error);
