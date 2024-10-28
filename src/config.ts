import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

function loadEnvironment() {
    try {
        // Explicitly set path to .env.dev
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

// Load environment file
const envLoaded = loadEnvironment();
console.log('Environment loaded:', envLoaded);

// Debug loaded environment variables
console.log('Environment Variables Check:', {
    openai: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT ? 'Set' : 'Not Set',
        apiKey: process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Not Set',
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ? 'Set' : 'Not Set'
    },
    search: {
        endpoint: process.env.AZURE_SEARCH_ENDPOINT ? 'Set' : 'Not Set',
        apiKey: process.env.AZURE_SEARCH_API_KEY ? 'Set' : 'Not Set',
        indexName: process.env.AZURE_SEARCH_INDEX_NAME ? 'Set' : 'Not Set'
    },
    bot: {
        id: process.env.BOT_ID ? 'Set' : 'Not Set',
        password: process.env.BOT_PASSWORD ? 'Set' : 'Not Set'
    }
});

const config = {
    // Bot Framework Configuration
    MicrosoftAppId: process.env.BOT_ID,
    MicrosoftAppType: process.env.BOT_TYPE,
    MicrosoftAppTenantId: process.env.BOT_TENANT_ID,
    MicrosoftAppPassword: process.env.BOT_PASSWORD,
    
    // Azure OpenAI Configuration
    azureOpenAI: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    },
    
    // Azure Search Configuration
    azureSearch: {
        endpoint: process.env.AZURE_SEARCH_ENDPOINT,
        indexName: process.env.AZURE_SEARCH_INDEX_NAME,
        apiKey: process.env.AZURE_SEARCH_API_KEY
    }
};

// Debug final config state
console.log('Final Config Check:', {
    hasOpenAI: !!config.azureOpenAI,
    openAI: {
        hasEndpoint: !!config.azureOpenAI?.endpoint,
        hasApiKey: !!config.azureOpenAI?.apiKey,
        hasDeploymentName: !!config.azureOpenAI?.deploymentName
    },
    hasSearch: !!config.azureSearch,
    search: {
        hasEndpoint: !!config.azureSearch?.endpoint,
        hasIndexName: !!config.azureSearch?.indexName,
        hasApiKey: !!config.azureSearch?.apiKey
    }
});

export default config;