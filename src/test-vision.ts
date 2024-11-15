import { OpenAIService } from './services/OpenAIService';
import { StorageService } from './services/StorageService';
import { VisionRequestMessage } from './types/ChatTypes';
import * as fs from 'fs';
import * as path from 'path';
import { azureStorageConfig } from './config/azure-config';

async function testVisionCapabilities() {
    try {
        // Initialize services
        const openAIService = new OpenAIService();
        const storageService = new StorageService();
        console.log('Services initialized');

        // Read the test image
        const imagePath = path.join(__dirname, '..', 'appPackage', 'color.png');
        const imageBuffer = fs.readFileSync(imagePath);
        console.log('Test image read successfully');

        // Upload to Azure Storage
        const blobName = `test-vision-${Date.now()}.png`;
        const containerName = azureStorageConfig.containerName;
        const imageUrl = await storageService.uploadFile(containerName, blobName, imageBuffer);
        console.log('Image uploaded to Azure Storage:', imageUrl);

        // Create vision message
        const message: VisionRequestMessage = {
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: 'What do you see in this image? Provide a detailed description.'
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: imageUrl
                    }
                }
            ]
        };

        console.log('Sending image for analysis...');
        const response = await openAIService.getVisionCompletion([message]);
        console.log('\nVision API Response:');
        console.log(response);

        // Clean up
        await storageService.deleteFile(containerName, blobName);
        console.log('Temporary image file deleted from storage');

    } catch (error) {
        console.error('Error in vision test:', error);
    }
}

// Run the test
testVisionCapabilities();
