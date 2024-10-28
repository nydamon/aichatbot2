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

  if (context.activity.type === "message") {
    await context.sendTraceActivity(
      "OnTurnError Trace",
      `${error}`,
      "https://www.botframework.com/schemas/error",
      "TurnError"
    );
    await context.sendActivity(`The bot encountered an error:\n ${error.message}`);
    await context.sendActivity("To continue to run this bot, please fix the bot source code.");
  }
};

// Set the onTurnError for the singleton CloudAdapter
adapter.onTurnError = onTurnErrorHandler;

// Create the bot that will handle incoming messages
const bot = new TeamsBot();

// Listen for incoming requests
app.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await bot.run(context);
  });
});

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    botName: "Teams AI Chat Bot"
  });
});

// Start the server
const PORT = process.env.PORT || 3978;
app.listen(PORT, () => {
  console.log(`\nBot Started, listening to ${process.env.BOT_ENDPOINT || `http://localhost:${PORT}`}`);
  console.log("Endpoints:");
  console.log(`- Bot Framework Messages: http://localhost:${PORT}/api/messages`);
  console.log(`- Health Check: http://localhost:${PORT}/health`);
});