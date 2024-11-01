"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
        }
        else {
            console.error('Environment file not found at:', envPath);
            return false;
        }
    }
    catch (err) {
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
    }
};
exports.default = config;
//# sourceMappingURL=config.js.map