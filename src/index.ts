import express from 'express';
import {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  TurnContext,
} from "botbuilder";
import { TeamsBot } from "./teamsBot";
import config from "./config";

// Create Express server
const app = express();

// Parse JSON payloads
app.use(express.json());

// Create adapter
const credentialsFactory = new ConfigurationServiceClientCredentialFactory(config);
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