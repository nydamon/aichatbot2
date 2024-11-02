import * as path from 'path';
import * as dotenv from 'dotenv';
import express from 'express';
import {
    CloudAdapter,
    ConfigurationServiceClientCredentialFactory,
    ConfigurationBotFrameworkAuthentication,
    TurnContext
} from "botbuilder";
import { TeamsBot } from './teamsBot';
import { OpenAIService } from './services/OpenAIService';
import { StorageService } from './services/StorageService';
import { SearchService } from './services/SearchService';
import {
    azureOpenAIConfig,
    azureStorageConfig,
    azureSearchConfig,
    credentialsConfig
} from './config/azure-config';

// Load environment variables
const envPath = path.resolve(process.cwd(), 'env', '.env.dev');
dotenv.config({ path: envPath });

// Debug logging setup
console.log('Loading environment from:', envPath);

const app = express();

// IMPORTANT: Add JSON body parser middleware to parse JSON request body
app.use(express.json());

// Bot Framework adapter setup (configuration for Teams and other channels)
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: credentialsConfig.MicrosoftAppId,
    MicrosoftAppPassword: credentialsConfig.MicrosoftAppPassword,
    MicrosoftAppTenantId: credentialsConfig.MicrosoftAppTenantId
});

const botFrameworkAuthentication = new ConfigurationBotFrameworkAuthentication(
    {},
    credentialsFactory
);

const adapter = new CloudAdapter(botFrameworkAuthentication);

// Error handler for bot errors
adapter.onTurnError = async (context: TurnContext, error: Error) => {
    console.error(`\n [onTurnError] unhandled error:`, error);
    await context.sendActivity(`The bot encountered an error: ${error.message}`);
};

// Initialize services
const openAIService = new OpenAIService();
const storageService = new StorageService();
const searchService = new SearchService(
    azureSearchConfig.endpoint,
    azureSearchConfig.indexName,
    azureSearchConfig.queryKey
);

// Initialize TeamsBot with services
const bot = new TeamsBot(openAIService, storageService, searchService);

// Message listener
app.post('/api/messages', async (req, res) => {
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
            storage: azureStorageConfig.accountName ? 'configured' : 'not configured',
            search: azureSearchConfig.endpoint ? 'configured' : 'not configured'
        }
    });
});

// Start server
const port = process.env.PORT || 3978;
app.listen(port, () => {
    console.log(`Bot is listening on port ${port}`);
});

// Graceful shutdown handlers remain the same
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
