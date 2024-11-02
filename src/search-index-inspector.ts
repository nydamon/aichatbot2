import { 
    SearchClient, 
    AzureKeyCredential,
    SearchOptions 
} from '@azure/search-documents';
import { azureSearchConfig } from './config/azure-config';

interface SearchDocument {
    id: string;
    content: string;
    metadata?: {
        fileName?: string;
        contentType?: string;
        size?: number;
    };
}

interface SearchError {
    message?: string;
    statusCode?: number;
    details?: unknown;
}

async function testSearchAccess(): Promise<void> {
    console.log('Starting basic search test...\n');

    try {
        const searchClient = new SearchClient<SearchDocument>(
            azureSearchConfig.endpoint,
            azureSearchConfig.indexName,
            new AzureKeyCredential(azureSearchConfig.queryKey)
        );

        const searchOptions: SearchOptions<SearchDocument> = {
            top: 5,
            select: ['id', 'content', 'metadata'],
            orderBy: ['id desc']
        };

        const searchResponse = await searchClient.search('*', searchOptions);
        let documentCount = 0;

        console.log('📄 Found Documents:\n');
        for await (const result of searchResponse.results ?? []) {
            documentCount++;
            const id = result.document.id;
            const fileName = id.split('/').pop() ?? 'unknown';
            
            console.log(`Document ${documentCount} ${'-'.repeat(30)}`);
            console.log(`ID: ${fileName}`);
            console.log('Preview:');
            console.log(result.document.content?.substring(0, 100)
                .split('\n')
                .map(line => `  ${line}`)
                .join('\n') + '...\n'
            );
        }

        console.log(`\n✅ Total Documents Found: ${documentCount}`);

    } catch (err: unknown) {
        const error = err as SearchError;
        console.error('❌ Search Error:', error?.message ?? 'Unknown error');
    }
}

testSearchAccess().catch((err: Error) => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
});