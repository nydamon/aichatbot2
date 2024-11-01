"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const botbuilder_1 = require("botbuilder");
const teamsBot_1 = require("./teamsBot");
const config_1 = __importDefault(require("./config"));
// Create Express server
const app = (0, express_1.default)();
// Parse JSON payloads
app.use(express_1.default.json());
// Create adapter
const credentialsFactory = new botbuilder_1.ConfigurationServiceClientCredentialFactory(config_1.default);
const botFrameworkAuthentication = new botbuilder_1.ConfigurationBotFrameworkAuthentication({}, credentialsFactory);
const adapter = new botbuilder_1.CloudAdapter(botFrameworkAuthentication);
// Error handler
const onTurnErrorHandler = async (context, error) => {
    console.error(`\n [onTurnError] unhandled error: ${error}`);
    console.error(error);
    await context.sendActivity(`The bot encountered an error: ${error.message}`);
};
adapter.onTurnError = onTurnErrorHandler;
// Create the bot
const bot = new teamsBot_1.TeamsBot();
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
//# sourceMappingURL=index.js.map