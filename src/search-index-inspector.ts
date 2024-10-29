import { 
    SearchIndexClient, 
    AzureKeyCredential, 
    SearchClient
} from '@azure/search-documents';
import config from './config';

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

async function inspectSearchIndex() {
    console.log('Starting Azure Search Index inspection...\n');

    try {
        // Create a Search Index Client
        const endpoint = config.azureSearch?.endpoint;
        const apiKey = config.azureSearch?.apiKey;
        const indexName = config.azureSearch?.indexName;

        if (!endpoint || !apiKey || !indexName) {
            throw new Error('Missing required search configuration');
        }

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
        console.log(`\nFetching schema for index: ${indexName}`);
        const index = await indexClient.getIndex(indexName);
        
        if (!index.fields) {
            throw new Error('No fields defined in the index');
        }

        console.log('\nIndex Fields:');
        index.fields.forEach((field: SearchField) => {
            console.log(`- ${field.name}`);
            console.log(`  Type: ${field.type}`);
            
            // Log field properties
            if (field.key) console.log('  Is Key Field: true');
            if (field.searchable) console.log('  Searchable: true');
            if (field.filterable) console.log('  Filterable: true');
            if (field.sortable) console.log('  Sortable: true');
            if (field.facetable) console.log('  Facetable: true');
            if (field.retrievable) console.log('  Retrievable: true');
            console.log('');
        });

        // Create field list for select
        const selectableFields = index.fields
            .filter((field: SearchField) => field.retrievable)
            .map(field => field.name);

        console.log('Selectable fields:', selectableFields);

        // Test a sample search
        const searchClient = new SearchClient(
            endpoint,
            indexName,
            new AzureKeyCredential(apiKey)
        );

        if (selectableFields.length > 0) {
            console.log('\nTesting search with available fields...');
            const searchResults = await searchClient.search('*', {
                top: 1,
                select: selectableFields
            });

            console.log('\nSearch results:');
            let foundDocuments = false;
            for await (const result of searchResults.results) {
                console.log('Sample document structure:');
                console.log(JSON.stringify(result.document, null, 2));
                foundDocuments = true;
                break;
            }

            if (!foundDocuments) {
                console.log('No documents found in the index');
            }
        } else {
            console.log('No retrievable fields found in the index');
        }

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
inspectSearchIndex().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});