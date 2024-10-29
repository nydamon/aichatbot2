import { 
    SearchIndexClient, 
    AzureKeyCredential,
    SearchClient,
    SearchOptions
} from '@azure/search-documents';
import config from './config';
import * as fs from 'fs';
import * as path from 'path';

interface SearchDocument {
    id: string;
    content: string;
    title: string;
    category: string;
    timestamp: string;
    fileType: string;
    source: string;
    [key: string]: unknown;
}

// File handling configuration
const fileHandling = {
    mode: 'archive', // 'archive' or 'delete'
    archivePath: path.join(__dirname, '../processed_documents'),
    batchSize: 100
};

async function bulkUploadDocuments(documentsPath: string) {
    console.log('Starting bulk document upload...\n');

    try {
        const endpoint = config.azureSearch?.endpoint;
        const apiKey = config.azureSearch?.apiKey;
        const indexName = config.azureSearch?.indexName;

        if (!endpoint || !apiKey || !indexName) {
            throw new Error('Missing required search configuration');
        }

        // Create archive directory if needed
        if (fileHandling.mode === 'archive' && !fs.existsSync(fileHandling.archivePath)) {
            fs.mkdirSync(fileHandling.archivePath, { recursive: true });
        }

        // Initialize clients
        const indexClient = new SearchIndexClient(
            endpoint,
            new AzureKeyCredential(apiKey)
        );
        const searchClient = indexClient.getSearchClient<SearchDocument>(indexName);

        // Process files
        console.log(`Reading documents from: ${documentsPath}`);
        const files = fs.readdirSync(documentsPath);
        if (files.length === 0) {
            console.log('No files found in documents directory');
            return;
        }

        const documents: SearchDocument[] = [];
        let processed = 0;
        const processedFiles: string[] = [];
        const failedFiles: string[] = [];

        // Process each file
        for (const file of files) {
            const filePath = path.join(documentsPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const fileExt = path.extname(file).toLowerCase();
                    const fileBaseName = path.basename(file, fileExt);
                    
                    // Create searchable document
                    const document: SearchDocument = {
                        id: `doc-${Date.now()}-${processed}`,
                        content: content,
                        title: fileBaseName,
                        category: determineCategoryFromContent(content, fileBaseName),
                        timestamp: new Date().toISOString(),
                        fileType: fileExt.replace('.', '') || 'txt',
                        source: 'bulk-upload'
                    };

                    documents.push(document);
                    processedFiles.push(filePath);
                    processed++;

                    // Upload in batches
                    if (documents.length >= fileHandling.batchSize) {
                        await uploadBatch(searchClient, documents);
                        await handleProcessedFiles(processedFiles);
                        console.log(`Uploaded and processed batch of ${documents.length} documents`);
                        documents.length = 0;
                        processedFiles.length = 0;
                    }
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    failedFiles.push(file);
                }
            }
        }

        // Upload any remaining documents
        if (documents.length > 0) {
            await uploadBatch(searchClient, documents);
            await handleProcessedFiles(processedFiles);
            console.log(`Uploaded final batch of ${documents.length} documents`);
        }

        // Verify upload
        console.log('\nVerifying upload...');
        const searchOptions: SearchOptions<SearchDocument> = {
            top: 5,
            select: ['id', 'title', 'category', 'timestamp', 'fileType'],
            orderBy: ['timestamp desc']
        };

        const searchResults = await searchClient.search('*', searchOptions);

        console.log('\nRecently uploaded documents:');
        let resultCount = 0;
        for await (const result of searchResults.results) {
            resultCount++;
            console.log('\nDocument', resultCount);
            console.log(JSON.stringify(result.document, null, 2));
        }

        // Test specific document search
        console.log('\nTesting content search...');
        const contentSearchResults = await searchClient.search('API', {
            select: ['title', 'content'],
            top: 1
        });

        console.log('\nSample content search for "API":');
        for await (const result of contentSearchResults.results) {
            console.log(JSON.stringify(result.document, null, 2));
        }

        // Get index statistics
        const countResults = await searchClient.search('*', {
            top: 0,
            includeTotalCount: true
        });

        // Final report
        console.log('\nUpload Summary:');
        console.log('----------------');
        console.log(`Total files processed: ${processed}`);
        console.log(`Successfully uploaded: ${processed - failedFiles.length}`);
        console.log(`Failed files: ${failedFiles.length}`);
        console.log(`Total documents in index: ${countResults.count || 'Unknown'}`);
        
        if (failedFiles.length > 0) {
            console.log('\nFailed files:');
            failedFiles.forEach(file => console.log(`- ${file}`));
        }

    } catch (error) {
        console.error('Error in bulk upload:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
        throw error; // Re-throw to indicate failure to calling code
    }
}

async function uploadBatch(searchClient: SearchClient<SearchDocument>, documents: SearchDocument[]) {
    try {
        const result = await searchClient.uploadDocuments(documents);
        console.log(`Batch upload results: ${result.results.length} documents processed`);
        
        const failures = result.results.filter(r => !r.succeeded);
        if (failures.length > 0) {
            console.error('Failed uploads:', failures);
        }
        return failures.length === 0;
    } catch (error) {
        console.error('Error uploading batch:', error);
        throw error;
    }
}

async function handleProcessedFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
        try {
            if (fileHandling.mode === 'archive') {
                const fileName = path.basename(filePath);
                const archivePath = path.join(fileHandling.archivePath, fileName);
                fs.renameSync(filePath, archivePath);
                console.log(`Archived: ${fileName}`);
            } else if (fileHandling.mode === 'delete') {
                fs.unlinkSync(filePath);
                console.log(`Deleted: ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.error(`Error handling processed file ${filePath}:`, error);
        }
    }
}

function determineCategoryFromContent(content: string, fileName: string): string {
    // Simple category determination logic
    const lowerContent = content.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileName.includes('api') || lowerContent.includes('api')) {
        return 'API Documentation';
    } else if (lowerFileName.includes('guide') || lowerContent.includes('guide')) {
        return 'User Guide';
    } else if (lowerFileName.includes('release') || lowerContent.includes('release notes')) {
        return 'Release Notes';
    } else if (lowerFileName.includes('troubleshoot') || lowerContent.includes('troubleshoot')) {
        return 'Troubleshooting';
    }
    
    return 'General Documentation';
}

// Example usage
if (require.main === module) {
    const documentsPath = process.argv[2] || path.join(__dirname, '../documents');
    if (!fs.existsSync(documentsPath)) {
        console.error(`Documents directory not found: ${documentsPath}`);
        process.exit(1);
    }
    bulkUploadDocuments(documentsPath).catch(error => {
        console.error('Fatal error in bulk upload:', error);
        process.exit(1);
    });
}

export { bulkUploadDocuments, SearchDocument };