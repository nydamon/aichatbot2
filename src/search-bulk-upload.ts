import { 
    SearchIndexClient, 
    AzureKeyCredential,
    SearchClient
} from '@azure/search-documents';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Debug logging for directory locations
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// Load environment variables
const envPath = path.resolve(process.cwd(), 'env', '.env.dev');
console.log('Attempting to load environment from:', envPath);

try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        throw result.error;
    }
    console.log('Environment file loaded successfully');
} catch (error) {
    console.error('Error loading environment file:', error);
    throw error;
}

interface SearchDocument {
    id: string;
    content: string;
    fileName: string;
    fileType: string;
    timestamp: string;
    url: string;
    source: string;
}

class SearchService {
    private client: SearchClient<SearchDocument>;

    constructor() {
        const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
        const apiKey = process.env.AZURE_SEARCH_API_KEY;
        const indexName = process.env.AZURE_SEARCH_INDEX_NAME;

        if (!endpoint || !apiKey || !indexName) {
            throw new Error('Missing required search configuration');
        }

        this.client = new SearchClient<SearchDocument>(
            endpoint,
            indexName,
            new AzureKeyCredential(apiKey),
            {
                apiVersion: '2023-11-01'  // Specify a known good API version
            }
        );
    }

    async uploadDocument(document: SearchDocument): Promise<void> {
        try {
            const result = await this.client.uploadDocuments([document]);
            console.log(`Document uploaded successfully: ${result.results[0].succeeded}`);
        } catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    }
}

async function bulkUploadDocuments(documentsPath: string) {
    console.log('Starting bulk document upload...\n');

    try {
        const searchService = new SearchService();

        // Read files
        console.log(`Reading documents from: ${documentsPath}`);
        const files = fs.readdirSync(documentsPath);
        console.log(`Found ${files.length} files in directory`);
        
        if (files.length === 0) {
            console.log('No files found in documents directory');
            return;
        }

        // Process each file
        for (const file of files) {
            const filePath = path.join(documentsPath, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
                try {
                    console.log(`\nProcessing file: ${file}`);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const fileExt = path.extname(file).toLowerCase();
                    const timestamp = Date.now();
                    const uniqueFileName = `${timestamp}-${file}`;

                    const searchDoc: SearchDocument = {
                        id: uniqueFileName,
                        content: content,
                        fileName: file,
                        fileType: fileExt.replace('.', ''),
                        timestamp: new Date().toISOString(),
                        url: '', // Leave empty for bulk upload
                        source: 'bulk-upload'
                    };

                    await searchService.uploadDocument(searchDoc);
                    console.log(`Successfully processed: ${file}`);

                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                }
            }
        }

    } catch (error) {
        console.error('Error in bulk upload:', error);
        throw error;
    }
}

// Example usage
if (require.main === module) {
    const possiblePaths = [
        path.join(process.cwd(), 'documents'),
        path.join(process.cwd(), 'AI Chat Bot', 'documents'),
        path.join(__dirname, '../../documents'),
        path.join(__dirname, '../documents'),
        '/Users/damondecrescenzo/TeamsApps/AI Chat Bot/documents'
    ];

    let documentsPath = '';
    for (const testPath of possiblePaths) {
        console.log('Checking path:', testPath);
        if (fs.existsSync(testPath)) {
            documentsPath = testPath;
            console.log('Found documents directory at:', documentsPath);
            break;
        }
    }

    if (!documentsPath) {
        console.error('Documents directory not found in any of these locations:', possiblePaths);
        process.exit(1);
    }

    bulkUploadDocuments(documentsPath).catch(error => {
        console.error('Fatal error in bulk upload:', error);
        process.exit(1);
    });
}

export { bulkUploadDocuments, SearchDocument };
