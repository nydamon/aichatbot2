import express from 'express';
import {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  TurnContext,
} from "botbuilder";
import { TeamsBot } from "./teamsBot";
// import { config } from "./config"; // Removed because it is not exported from the module
import { azureOpenAIConfig, azureSearchConfig, azureStorageConfig, credentialsConfig } from './config';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { SearchClient } from '@azure/search-documents';
import { StorageSharedKeyCredential, BlobServiceClient } from '@azure/storage-blob';

// Initialize the credentials factory with the correct configuration
const credentialsFactory = new ConfigurationServiceClientCredentialFactory(credentialsConfig);

// Initialize other clients with their respective configurations
if (!azureOpenAIConfig.endpoint || !azureOpenAIConfig.apiKey) {
  throw new Error("Azure OpenAI configuration is missing endpoint or API key.");
}
const openAIClient = new OpenAIClient(azureOpenAIConfig.endpoint, new AzureKeyCredential(azureOpenAIConfig.apiKey));

if (!azureSearchConfig.endpoint || !azureSearchConfig.indexName || !azureSearchConfig.apiKey) {
  throw new Error("Azure Search configuration is missing endpoint, index name, or API key.");
}
const searchClient = new SearchClient(azureSearchConfig.endpoint, azureSearchConfig.indexName, new AzureKeyCredential(azureSearchConfig.apiKey));
if (!azureStorageConfig.accountName || !azureStorageConfig.accountKey) {
  throw new Error("Azure Storage configuration is missing account name or account key.");
}
const sharedKeyCredential = new StorageSharedKeyCredential(azureStorageConfig.accountName, azureStorageConfig.accountKey);
const blobClient = new BlobServiceClient(`https://${azureStorageConfig.accountName}.blob.core.windows.net`, sharedKeyCredential);

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
  console.error(`\n [onTurnError] unhandled error: ${error}`);
  console.error(error);
  await context.sendActivity(`The bot encountered an error: ${error.message}`);
};

adapter.onTurnError = onTurnErrorHandler;

// Create the bot
const bot = new TeamsBot();

// Listen for incoming requests at /api/messages
app.post('/api/messages', async (req, res) => {
  console.log('Received message:', req.body);
  await adapter.process(req, res, async (context) => {
    await bot.run(context);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Add a root endpoint for testing
app.get('/', (req, res) => {
  res.json({ status: 'Bot is running' });
});

const PORT = process.env.PORT || 3978;
app.listen(PORT, () => {
  console.log(`\nBot Started, listening at http://localhost:${PORT}`);
  console.log(`- Bot Framework Messages: http://localhost:${PORT}/api/messages`);
  console.log(`- Health Check: http://localhost:${PORT}/health`);
});