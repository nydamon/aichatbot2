import { 
    SearchIndexClient, 
    AzureKeyCredential, 
    SearchClient
} from '@azure/search-documents';
import { azureSearchConfig } from '../src/config/azure-config';

interface SearchField {
    name: string;
    type: string;
    searchable?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    facetable?: boolean;
    retrievable?: boolean;
    key?: boolean;
}

interface SOPDocument {
    id: string;
    title?: string;
    content?: string;
    created?: Date;
    modified?: Date;
    author?: string;
    [key: string]: unknown;
}

async function inspectSOPSearchIndex() {
    console.log('Starting SOP Search Index inspection...\n');

    try {
        // Create a Search Index Client
        const endpoint = azureSearchConfig.endpoint;
        const apiKey = azureSearchConfig.apiKey;
        const indexName = azureSearchConfig.indexName;

        console.log('Configuration:', {
            endpoint,
            indexName,
            hasApiKey: !!apiKey
        });

        const indexClient = new SearchIndexClient(
            endpoint,
            new AzureKeyCredential(apiKey)
        );

        // Get index definition
        console.log(`\nFetching schema for SOP index: ${indexName}`);
        const index = await indexClient.getIndex(indexName);
        
        if (!index.fields) {
            throw new Error('No fields defined in the index');
        }

        // Display index schema
        console.log('\nIndex Fields Schema:');
        index.fields.forEach((field: SearchField) => {
            console.log(`- ${field.name}`);
            console.log(`  Type: ${field.type}`);
            
            const properties = [];
            if (field.key) properties.push('Key');
            if (field.searchable) properties.push('Searchable');
            if (field.filterable) properties.push('Filterable');
            if (field.sortable) properties.push('Sortable');
            if (field.facetable) properties.push('Facetable');
            if (field.retrievable) properties.push('Retrievable');
            
            if (properties.length > 0) {
                console.log(`  Properties: ${properties.join(', ')}`);
            }
            console.log('');
        });

        // Create search client and test searches
        const searchClient = new SearchClient<SOPDocument>(
            endpoint,
            indexName,
            new AzureKeyCredential(apiKey)
        );

        // Test 1: Get recent SOPs
        console.log('\nTesting Recent SOPs:');
        const recentResults = await searchClient.search('*', {
            top: 5,
            select: ['id', 'title', 'content', 'created', 'modified', 'author'] as string[],
            orderBy: ['created desc'] as string[]
        });

        console.log('\nMost Recent Documents:');
        for await (const result of recentResults.results) {
            console.log('\nDocument:', {
                id: result.document.id,
                title: result.document.title,
                created: result.document.created,
                author: result.document.author,
                contentPreview: result.document.content?.substring(0, 150) + '...'
            });
        }

        // Test 2: Search for specific SOP terms
        console.log('\nTesting SOP Keyword Search:');
        const sopResults = await searchClient.search('procedure OR policy OR standard', {
            top: 3,
            select: ['id', 'title', 'content'] as string[],
            highlightFields: 'content'
        });

        console.log('\nSOP Keyword Search Results:');
        for await (const result of sopResults.results) {
            console.log('\nDocument:', {
                id: result.document.id,
                title: result.document.title,
                highlights: result.highlights?.content
            });
        }

        // Test 3: Get document count
        console.log('\nChecking Total Documents:');
        const countResults = await searchClient.search('*', {
            top: 0,
            includeTotalCount: true
        });

        console.log(`Total documents in index: ${countResults.count || 0}`);

    } catch (error) {
        console.error('Error inspecting search index:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }
}

// Run the inspection
inspectSOPSearchIndex().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

export default inspectSOPSearchIndex;
