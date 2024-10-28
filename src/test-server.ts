import express, { Request, Response, NextFunction } from 'express';

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Basic test route
app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.json({ message: 'Hello World!' });
});

// Health check route
app.get('/health', (req: Request, res: Response, next: NextFunction) => {
    res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3978;  // Simplified PORT handling
app.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
    console.log('Try these endpoints:');
    console.log(`- http://localhost:${PORT}/`);
    console.log(`- http://localhost:${PORT}/health`);
});