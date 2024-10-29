import { 
    SearchIndexClient, 
    AzureKeyCredential,
    SearchIndex,
    SearchField
} from '@azure/search-documents';
import config from './config';

async function setupSearchIndex() {
    console.log('Starting Azure Search Index setup...\n');

    try {
        const endpoint = config.azureSearch?.endpoint;
        const apiKey = config.azureSearch?.apiKey;
        const indexName = config.azureSearch?.indexName;

        if (!endpoint || !apiKey || !indexName) {
            throw new Error('Missing required search configuration');
        }

        const indexClient = new SearchIndexClient(
            endpoint,
            new AzureKeyCredential(apiKey)
        );

        // Define the index schema
        const searchIndex: SearchIndex = {
            name: indexName,
            fields: [
                {
                    name: "id",
                    type: "Edm.String",
                    key: true,
                    searchable: true,
                    filterable: true,
                    sortable: true,
                    facetable: true,
                    retrievable: true
                } as SearchField,
                {
                    name: "content",
                    type: "Edm.String",
                    searchable: true,
                    retrievable: true,
                    analyzer: "standard.lucene"
                } as SearchField,
                {
                    name: "title",
                    type: "Edm.String",
                    searchable: true,
                    retrievable: true,
                    sortable: true,
                    analyzer: "standard.lucene"
                } as SearchField,
                {
                    name: "category",
                    type: "Edm.String",
                    searchable: true,
                    filterable: true,
                    facetable: true,
                    retrievable: true
                } as SearchField,
                {
                    name: "timestamp",
                    type: "Edm.DateTimeOffset",
                    filterable: true,
                    sortable: true,
                    retrievable: true
                } as SearchField,
                {
                    name: "fileType",
                    type: "Edm.String",
                    filterable: true,
                    facetable: true,
                    retrievable: true
                } as SearchField,
                {
                    name: "source",
                    type: "Edm.String",
                    searchable: true,
                    filterable: true,
                    retrievable: true
                } as SearchField
            ]
        };

        // Check if index exists
        console.log('Checking if index exists...');
        try {
            const existingIndex = await indexClient.getIndex(indexName);
            console.log('Index exists, updating schema...');
            await indexClient.createOrUpdateIndex(searchIndex);
            console.log('Index schema updated successfully');
        } catch (error) {
            console.log('Index does not exist, creating new index...');
            await indexClient.createIndex(searchIndex);
            console.log('Index created successfully');
        }

        // Create a test document
        const searchClient = indexClient.getSearchClient(indexName);

        console.log('\nUploading test document...');
        await searchClient.uploadDocuments([
            {
                id: "test-doc-1",
                content: "This is a test document for the Azure Cognitive Search index. It contains sample content to verify the search functionality.",
                title: "Test Document",
                category: "Test",
                timestamp: new Date().toISOString(),
                fileType: "text",
                source: "setup-script"
            }
        ]);

        // Verify search functionality
        console.log('\nVerifying search functionality...');
        const searchResults = await searchClient.search('test', {
            select: ['id', 'content', 'title'],
            top: 1
        });

        console.log('Search test results:');
        for await (const result of searchResults.results) {
            console.log(JSON.stringify(result.document, null, 2));
        }

        console.log('\nSetup completed successfully!');

    } catch (error) {
        console.error('Error in setup:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }
}

// Run the setup
setupSearchIndex().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});