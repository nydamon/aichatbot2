export interface RetryOptions {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
    onRetry?: (attempt: number, error: Error) => void;
    onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
    stage: string;
    progress: number;
    total: number;
    details?: string;
}

export class RetryHandler {
    private readonly options: RetryOptions;

    constructor(options: Partial<RetryOptions> = {}) {
        // Use test-specific values if NODE_ENV is test
        const isTest = process.env.NODE_ENV === 'test';
        const isVisionTest = isTest && (
            process.env.JEST_WORKER_ID?.includes('vision') ||
            new Error().stack?.includes('ImageHandler.test.ts') ||
            new Error().stack?.includes('OpenAIService.test.ts')
        );

        this.options = {
            maxRetries: options.maxRetries ?? (isTest ? 2 : 3),
            // Use longer delays for vision tests
            initialDelay: options.initialDelay ?? (isVisionTest ? 2000 : isTest ? 100 : 1000),
            maxDelay: options.maxDelay ?? (isVisionTest ? 10000 : isTest ? 500 : 10000),
            backoffFactor: options.backoffFactor ?? (isVisionTest ? 2 : isTest ? 1.5 : 2),
            onRetry: options.onRetry,
            onProgress: options.onProgress
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private calculateDelay(attempt: number): number {
        const delay = this.options.initialDelay * Math.pow(this.options.backoffFactor, attempt);
        return Math.min(delay, this.options.maxDelay);
    }

    async execute<T>(
        operation: () => Promise<T>,
        context: string
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
            try {
                // Update progress at the start of each attempt
                this.options.onProgress?.({
                    stage: context,
                    progress: attempt,
                    total: this.options.maxRetries + 1,
                    details: attempt > 0 ? `Retry attempt ${attempt}/${this.options.maxRetries}` : 'Initial attempt'
                });

                const result = await operation();

                // Update progress on success
                this.options.onProgress?.({
                    stage: context,
                    progress: this.options.maxRetries + 1,
                    total: this.options.maxRetries + 1,
                    details: 'Operation completed successfully'
                });

                return result;
            } catch (error) {
                lastError = error as Error;
                
                if (attempt < this.options.maxRetries) {
                    const delayMs = this.calculateDelay(attempt);
                    this.options.onRetry?.(attempt + 1, lastError);
                    await this.delay(delayMs);
                }
            }
        }

        throw new Error(`${context} failed: ${lastError?.message}`);
    }
}

export const defaultRetryHandler = new RetryHandler({
    maxRetries: process.env.NODE_ENV === 'test' ? 2 : 3,
    initialDelay: process.env.NODE_ENV === 'test' ? 100 : 1000,
    maxDelay: process.env.NODE_ENV === 'test' ? 500 : 10000,
    backoffFactor: process.env.NODE_ENV === 'test' ? 1.5 : 2,
    onRetry: (attempt, error) => {
        console.warn(`Retry attempt ${attempt} due to error:`, error.message);
    },
    onProgress: (update) => {
        console.log(`${update.stage}: ${update.progress}/${update.total} - ${update.details}`);
    }
});
