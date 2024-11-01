import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

function loadEnvironment() {
    try {
        // Update path to look in /env from project root
        const envPath = path.resolve(__dirname, '../env/.env.dev');
        console.log('Attempting to load environment from:', envPath);
        
        if (fs.existsSync(envPath)) {
            const result = dotenv.config({ path: envPath });
            if (result.error) {
                console.error('Error loading environment:', result.error);
                return false;
            }
            console.log('Environment file loaded successfully');
            return true;
        } else {
            console.error('Environment file not found at:', envPath);
            return false;
        }
    } catch (err) {
        console.error('Error in loadEnvironment:', err);
        return false;
    }
}

// Rest of your config.ts remains the same...
const envLoaded = loadEnvironment();
console.log('Environment loaded:', envLoaded);

// Debug loaded environment variables
console.log('Environment Variables Check:', {
    openai: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT ? 'Set' : 'Not Set',
        apiKey: process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Not Set',
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ? 'Set' : 'Not Set'
    }
});

const azureOpenAIConfig = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
};

const azureSearchConfig = {
    endpoint: process.env.AZURE_SEARCH_ENDPOINT,
    apiKey: process.env.AZURE_SEARCH_API_KEY,
    indexName: process.env.AZURE_SEARCH_INDEX_NAME,
};

const azureStorageConfig = {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: process.env.AZURE_STORAGE_KEY,
};

const credentialsConfig = {
    CertificateThumbprint: process.env.CERTIFICATE_THUMBPRINT,
    CertificatePrivateKey: process.env.CERTIFICATE_PRIVATE_KEY,
    MicrosoftAppId: process.env.MICROSOFT_APP_ID,
    MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
    MicrosoftAppType: process.env.MICROSOFT_APP_TYPE,
    MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID,
};

export { azureOpenAIConfig, azureSearchConfig, azureStorageConfig, credentialsConfig };