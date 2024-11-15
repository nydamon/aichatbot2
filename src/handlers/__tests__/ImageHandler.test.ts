import { ImageHandler } from '../ImageHandler';
import { StorageService } from '../../services/StorageService';
import { OpenAIService } from '../../services/OpenAIService';
import { TurnContext } from 'botbuilder';

describe('ImageHandler Live Tests', () => {
    let handler: ImageHandler;
    let storageService: StorageService;
    let openAIService: OpenAIService;
    let mockContext: Partial<TurnContext>;

    // Simple 1x1 red pixel PNG
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    beforeAll(() => {
        storageService = new StorageService();
        openAIService = new OpenAIService();
        handler = new ImageHandler(storageService, openAIService);

        mockContext = {
            sendActivity: jest.fn().mockResolvedValue({ id: '1' })
        };
    });

    describe('Image Processing', () => {
        it('should detect colors in images', async () => {
            const imageBuffer = Buffer.from(testImageBase64, 'base64');
            const result = await handler.processImage(imageBuffer, 'test.png');
            expect(result.toLowerCase()).toContain('red');
        }, 30000);

        it('should handle multiple requests', async () => {
            const imageBuffer = Buffer.from(testImageBase64, 'base64');
            const result1 = await handler.processImage(imageBuffer, 'test1.png');
            const result2 = await handler.processImage(imageBuffer, 'test2.png');

            expect(result1.toLowerCase()).toContain('red');
            expect(result2.toLowerCase()).toContain('red');
        }, 60000);
    });

    describe('Image Upload Handling', () => {
        it('should handle valid image upload', async () => {
            const imageBuffer = Buffer.from(testImageBase64, 'base64');
            await handler.handleImageUpload(mockContext as TurnContext, imageBuffer, 'test.png');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('red')
            );
        }, 30000);

        it('should reject oversized images', async () => {
            const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
            
            await handler.handleImageUpload(mockContext as TurnContext, largeBuffer, 'large.png');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('size exceeds limit')
            );
        });

        it('should reject unsupported file types', async () => {
            const testBuffer = Buffer.from('test data');
            
            await handler.handleImageUpload(mockContext as TurnContext, testBuffer, 'test.xyz');

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.stringContaining('Unsupported image type')
            );
        });
    });

    describe('Image Download', () => {
        it('should handle download errors gracefully', async () => {
            await expect(handler.downloadImage('http://invalid-url.xyz/image.jpg'))
                .rejects.toThrow('Failed to download image');
        });
    });
});
