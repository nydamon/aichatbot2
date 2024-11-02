import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Define the document interface
interface SearchDocument {
    id: string;
    content: string;
    fileName: string;
    fileType: string;
    timestamp: string;
    url: string;
    source: string;
}

async function testSearchCredentials() {
    try {
        // Load environment variables
        const envPath = path.resolve(process.cwd(), 'env', '.env.dev');
        console.log('Loading environment from:', envPath);
        const result = dotenv.config({ path: envPath });
        if (result.error) {
            throw result.error;
        }

        // Get configuration using the admin API key, not the query key
        const endpoint = process.env.AZURE_SEARCH_ENDPOINT?.trim();
        const apiKey = process.env.AZURE_SEARCH_API_KEY?.trim(); // Make sure this is the admin API key
        const indexName = process.env.AZURE_SEARCH_INDEX_NAME?.trim();

        console.log('\nConfiguration Check:');
        console.log('-------------------');
        console.log(`Endpoint: ${endpoint}`);
        console.log(`Index Name: ${indexName}`);
        console.log(`API Key (first 5 chars): ${apiKey?.substring(0, 5)}...`);

        if (!endpoint || !apiKey || !indexName) {
            throw new Error('Missing required configuration');
        }

        // Create search client
        console.log('\nInitializing Search Client...');
        const searchClient = new SearchClient(
            endpoint,
            indexName,
            new AzureKeyCredential(apiKey)
        );

        // Test 1: List indexes to verify admin access
        console.log('\nTest 1: Performing test search...');
        const searchResults = await searchClient.search('*', {
            select: ['id', 'fileName'],
            top: 1
        });

        console.log('Search request sent successfully...');

        let resultCount = 0;
        for await (const result of searchResults.results) {
            const document = result.document as SearchDocument;
            resultCount++;
            console.log('Sample document:', {
                id: document.id,
                fileName: document.fileName
            });
        }
        console.log(`Search completed. Found ${resultCount} results`);

        // Test 2: Upload a test document
        console.log('\nTest 2: Attempting to upload test document...');
        const testDoc: SearchDocument = {
            id: `test-${Date.now()}`,
            content: 'This is a test document content',
            fileName: 'test-document.txt',
            fileType: 'txt',
            timestamp: new Date().toISOString(),
            url: 'https://example.com/test-doc',
            source: 'test-upload'
        };

        console.log('Uploading document:', testDoc);
        const uploadResult = await searchClient.uploadDocuments([testDoc]);
        console.log('Upload response:', uploadResult);

        console.log('\nAll tests completed successfully! ✅');

    } catch (error: any) {
        console.error('\n❌ Error during testing:');
        
        // Enhanced error logging
        if (error.code === 'RestError') {
            console.error('Azure Search REST Error:', {
                message: error.message,
                statusCode: error.statusCode,
                details: error.details,
                code: error.code
            });
        } else {
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
        }

        // Log additional request details if available
        if (error.request) {
            console.error('\nRequest details:', {
                url: error.request.url,
                method: error.request.method,
                headers: error.request.headers
            });
        }

        // Log the full error object for debugging
        console.error('\nFull error object:', JSON.stringify(error, null, 2));
    }
}

// Run the test
testSearchCredentials().catch(error => {
    console.error('Unhandled error:', error);
});
