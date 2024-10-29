"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
// Middleware to parse JSON bodies
app.use(express_1.default.json());
// Basic test route
app.get('/', (req, res, next) => {
    res.json({ message: 'Hello World!' });
});
// Health check route
app.get('/health', (req, res, next) => {
    res.json({ status: 'healthy' });
});
const PORT = process.env.PORT || 3978; // Simplified PORT handling
app.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
    console.log('Try these endpoints:');
    console.log(`- http://localhost:${PORT}/`);
    console.log(`- http://localhost:${PORT}/health`);
});
//# sourceMappingURL=test-server.js.map