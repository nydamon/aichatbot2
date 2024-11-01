import * as dotenv from 'dotenv';
import * as path from 'path';

// Debug logs for environment loading
console.log('Config - Current directory:', process.cwd());
console.log('Config - Directory name:', __dirname);

// Load environment variables
const envPath = path.resolve(process.cwd(), 'env', 'env-dev');
console.log('Config - Loading environment from:', envPath);

try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        throw result.error;
    }
    console.log('Config - Environment file loaded successfully');
} catch (error) {
    console.error('Config - Error loading environment file:', error);
    throw error;
}

// Interface definitions
export interface AzureOpenAIConfig {
    serviceName: string;
    endpoint: string;
    apiKey: string;
    deploymentName: string;
    embeddingsDeploymentName: string;
}

export interface AzureSearchConfig {
    serviceName: string;
    endpoint: string;
    apiKey: string;
    queryKey: string;
    indexName: string;
}

export interface AzureStorageConfig {
    accountName: string;
    containerName: string;
    key: string;
    connectionString: string;
}

export interface CredentialsConfig {
    MicrosoftAppId: string;
    MicrosoftAppPassword: string;
    MicrosoftAppTenantId: string;
}

// Helper function to get and validate environment variables
function getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

// Configuration objects
export const azureOpenAIConfig: AzureOpenAIConfig = {
    serviceName: getRequiredEnvVar('AZURE_OPENAI_SERVICE_NAME'),
    endpoint: getRequiredEnvVar('AZURE_OPENAI_ENDPOINT'),
    apiKey: getRequiredEnvVar('AZURE_OPENAI_API_KEY'),
    deploymentName: getRequiredEnvVar('AZURE_OPENAI_DEPLOYMENT_NAME'),
    embeddingsDeploymentName: getRequiredEnvVar('AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME')
};

export const azureSearchConfig: AzureSearchConfig = {
    serviceName: getRequiredEnvVar('AZURE_SEARCH_SERVICE_NAME'),
    endpoint: getRequiredEnvVar('AZURE_SEARCH_ENDPOINT'),
    apiKey: getRequiredEnvVar('AZURE_SEARCH_API_KEY'),
    queryKey: getRequiredEnvVar('AZURE_SEARCH_QUERY_KEY'),
    indexName: getRequiredEnvVar('AZURE_SEARCH_INDEX_NAME')
};

export const azureStorageConfig: AzureStorageConfig = {
    accountName: getRequiredEnvVar('AZURE_STORAGE_ACCOUNT_NAME'),
    containerName: getRequiredEnvVar('AZURE_STORAGE_CONTAINER_NAME'),
    key: getRequiredEnvVar('AZURE_STORAGE_KEY'),
    connectionString: getRequiredEnvVar('AZURE_STORAGE_CONNECTION_STRING')
};

export const credentialsConfig: CredentialsConfig = {
    MicrosoftAppId: getRequiredEnvVar('MICROSOFT_APP_ID'),
    MicrosoftAppPassword: getRequiredEnvVar('MICROSOFT_APP_PASSWORD'),
    MicrosoftAppTenantId: getRequiredEnvVar('AZURE_AD_TENANT_ID')
};

// Log configuration status (without sensitive values)
console.log('Configuration Status:');
console.log('Azure OpenAI:', {
    serviceName: azureOpenAIConfig.serviceName ? 'Set' : 'Missing',
    endpoint: azureOpenAIConfig.endpoint ? 'Set' : 'Missing',
    deploymentName: azureOpenAIConfig.deploymentName ? 'Set' : 'Missing',
    embeddingsDeploymentName: azureOpenAIConfig.embeddingsDeploymentName ? 'Set' : 'Missing'
});

console.log('Azure Search:', {
    serviceName: azureSearchConfig.serviceName ? 'Set' : 'Missing',
    endpoint: azureSearchConfig.endpoint ? 'Set' : 'Missing',
    indexName: azureSearchConfig.indexName ? 'Set' : 'Missing'
});

console.log('Azure Storage:', {
    accountName: azureStorageConfig.accountName ? 'Set' : 'Missing',
    containerName: azureStorageConfig.containerName ? 'Set' : 'Missing'
});

console.log('Bot Credentials:', {
    MicrosoftAppId: credentialsConfig.MicrosoftAppId ? 'Set' : 'Missing',
    MicrosoftAppTenantId: credentialsConfig.MicrosoftAppTenantId ? 'Set' : 'Missing'
});

// Export a function to validate the configuration
export function validateConfig(): void {
    console.log('Validating configuration...');
    
    // This will throw errors if any required variables are missing
    getRequiredEnvVar('AZURE_OPENAI_SERVICE_NAME');
    getRequiredEnvVar('AZURE_OPENAI_ENDPOINT');
    getRequiredEnvVar('AZURE_OPENAI_API_KEY');
    getRequiredEnvVar('AZURE_OPENAI_DEPLOYMENT_NAME');
    getRequiredEnvVar('AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME');
    
    getRequiredEnvVar('AZURE_SEARCH_SERVICE_NAME');
    getRequiredEnvVar('AZURE_SEARCH_ENDPOINT');
    getRequiredEnvVar('AZURE_SEARCH_API_KEY');
    getRequiredEnvVar('AZURE_SEARCH_QUERY_KEY');
    getRequiredEnvVar('AZURE_SEARCH_INDEX_NAME');
    
    getRequiredEnvVar('AZURE_STORAGE_ACCOUNT_NAME');
    getRequiredEnvVar('AZURE_STORAGE_CONTAINER_NAME');
    getRequiredEnvVar('AZURE_STORAGE_KEY');
    getRequiredEnvVar('AZURE_STORAGE_CONNECTION_STRING');
    
    getRequiredEnvVar('MICROSOFT_APP_ID');
    getRequiredEnvVar('MICROSOFT_APP_PASSWORD');
    getRequiredEnvVar('AZURE_AD_TENANT_ID');
    
    console.log('Configuration validation completed successfully');
}

// Validate configuration immediately
validateConfig();