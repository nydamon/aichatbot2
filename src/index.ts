import * as path from 'path';
import * as dotenv from 'dotenv';
import express from 'express';
import {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    ConfigurationBotFrameworkAuthentication,
    TurnContext,
} from "botbuilder";
import { TeamsBot } from "./teamsBot";
import { OpenAIService } from './services/OpenAIService';
import { SearchService } from './services/SearchService';
import { StorageService } from './services/StorageService';
import { 
    azureOpenAIConfig, 
    azureSearchConfig, 
    azureStorageConfig, 
    credentialsConfig 
} from './config/azure-config';

// Debug logs for environment loading
console.log('Current directory:', process.cwd());
console.log('Directory name:', __dirname);

// Load environment variables at the very beginning
const envPath = path.resolve(process.cwd(), 'env', 'env-dev');
console.log('Attempting to load environment from:', envPath);

try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
        console.error('Error loading environment file:', result.error);
        throw result.error;
    }
    console.log('Environment file loaded successfully');

    // Verify environment variables are loaded
    console.log('Environment Variables Check:', {
        openai: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT ? 'Set' : 'Not Set',
            apiKey: process.env.AZURE_OPENAI_API_KEY ? 'Set' : 'Not Set',
            deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME ? 'Set' : 'Not Set'
        },
        search: {
            endpoint: process.env.AZURE_SEARCH_ENDPOINT ? 'Set' : 'Not Set',
            apiKey: process.env.AZURE_SEARCH_API_KEY ? 'Set' : 'Not Set'
        },
        storage: {
            accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME ? 'Set' : 'Not Set',
            key: process.env.AZURE_STORAGE_KEY ? 'Set' : 'Not Set'
        }
    });

} catch (error) {
    console.error('Failed to load environment file:', error);
    throw error;
}

// Initialize services
const app = express();

try {
    const openAIService = new OpenAIService();
    const searchService = new SearchService();
    const storageService = new StorageService();
    console.log('Services initialized successfully');

    // Initialize the credentials factory with the correct configuration
    const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
        MicrosoftAppId: credentialsConfig.MicrosoftAppId,
        MicrosoftAppPassword: credentialsConfig.MicrosoftAppPassword,
        MicrosoftAppTenantId: credentialsConfig.MicrosoftAppTenantId
    });

    // Create Express server
    const app = express();

    // Parse JSON payloads
    app.use(express.json());

    // Create adapter
    const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
        {},
        credentialsFactory
    );
    const adapter = new CloudAdapter(botFrameworkAuthentication);

    // Error handler
    const onTurnErrorHandler = async (context: TurnContext, error: Error) => {
        console.error(`\n [onTurnError] unhandled error:`, error);
        await context.sendActivity(`The bot encountered an error: ${error.message}`);
    };

    adapter.onTurnError = onTurnErrorHandler;

    // Create the bot with dependencies
    const bot = new TeamsBot(openAIService, searchService, storageService);

    // Listen for incoming requests at /api/messages
    app.post('/api/messages', async (req, res) => {
        console.log('Received message:', req.body);
        await adapter.process(req, res, async (context) => {
            await bot.run(context);
        });
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            services: {
                openai: azureOpenAIConfig.endpoint ? 'configured' : 'not configured',
                search: azureSearchConfig.endpoint ? 'configured' : 'not configured',
                storage: azureStorageConfig.accountName ? 'configured' : 'not configured'
            },
            environment: process.env.NODE_ENV || 'development'
        });
    });

    // Add a root endpoint for testing
    app.get('/', (req, res) => {
        res.json({ 
            status: 'Bot is running',
            environment: process.env.NODE_ENV || 'development',
            startTime: new Date().toISOString()
        });
    });

    // Start the server
    const PORT = process.env.PORT || 3978;
    app.listen(PORT, () => {
        console.log(`\nBot Started, listening at http://localhost:${PORT}`);
        console.log(`- Bot Framework Messages: http://localhost:${PORT}/api/messages`);
        console.log(`- Health Check: http://localhost:${PORT}/health`);
    });

} catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
}

// Add graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Export for testing purposes
export { app };
