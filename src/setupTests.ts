import * as dotenv from 'dotenv';
import * as path from 'path';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Set longer timeout for vision tests
if (process.env.JEST_WORKER_ID?.includes('vision') ||
    new Error().stack?.includes('ImageHandler.test.ts') ||
    new Error().stack?.includes('OpenAIService.test.ts')) {
    jest.setTimeout(120000); // 2 minutes for vision tests
} else {
    jest.setTimeout(60000); // 1 minute for other tests
}

// Load environment variables from env/.env.dev
const envPath = path.resolve(process.cwd(), 'env', '.env.dev');
dotenv.config({ path: envPath });

// Ensure required environment variables are set
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required for vision tests');
}

// Configure console output for tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Only show console output for errors in test environment
console.log = (...args) => {
    if (args[0]?.includes('error') || args[0]?.includes('Error')) {
        originalConsoleLog(...args);
    }
};
console.warn = (...args) => {
    if (args[0]?.includes('error') || args[0]?.includes('Error')) {
        originalConsoleWarn(...args);
    }
};
console.error = (...args) => {
    originalConsoleError(...args);
};
