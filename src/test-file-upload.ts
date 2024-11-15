import { FileHandler } from './handlers/FileHandler';
import { StorageService } from './services/StorageService';
import { OpenAIService } from './services/OpenAIService';
import { TurnContext, Activity, ActivityTypes } from 'botbuilder';
import * as fs from 'fs';
import * as path from 'path';

async function testFileUpload() {
    // Initialize services
    const storageService = new StorageService();
    const openAIService = new OpenAIService();
    const fileHandler = new FileHandler(storageService, openAIService);

    // Create a mock context
    const mockActivity: Activity = {
        type: ActivityTypes.Message,
        attachments: [],
        id: '1',
        timestamp: new Date(),
        localTimestamp: new Date(),
        channelId: 'test',
        from: { id: 'test-user', name: 'Test User' },
        conversation: { 
            id: 'test-conversation',
            name: 'Test Conversation',
            conversationType: 'personal',
            isGroup: false
        },
        recipient: { id: 'bot', name: 'Bot' },
        serviceUrl: 'http://test',
        channelData: {},
        localTimezone: 'UTC',
        callerId: 'test-caller',
        label: 'test-label',
        text: '',
        textFormat: 'plain',
        locale: 'en-US',
        inputHint: 'acceptingInput',
        valueType: 'text',
        listenFor: []
    };

    const mockContext: Partial<TurnContext> = {
        activity: mockActivity,
        sendActivity: async (message) => {
            console.log('Bot:', message);
            return { id: '1' };
        }
    };

    try {
        // Create a test CSV file
        const csvContent = `Month,Sales,Expenses
January,1000,800
February,1200,850
March,1500,900
April,1300,850
May,1800,1000`;
        
        const csvPath = path.join(process.cwd(), 'test-data.csv');
        fs.writeFileSync(csvPath, csvContent);

        // Test with different file types
        const testFiles = [
            { 
                path: 'documents/Sales By Gateway.xlsx', 
                question: 'What is the total sales amount?',
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            { 
                path: 'documents/DLD_Enterprises_taxID (1).pdf', 
                question: 'What is the tax ID number?',
                contentType: 'application/pdf'
            },
            {
                path: 'appPackage/color.png',
                question: 'What do you see in this image?',
                contentType: 'image/png'
            },
            {
                path: 'test-data.csv',
                question: 'What is the total sales for all months?',
                contentType: 'text/csv'
            }
        ];

        for (const testFile of testFiles) {
            console.log(`\n=== Testing with file: ${testFile.path} ===`);
            
            try {
                // Read test file
                const filePath = path.join(process.cwd(), testFile.path);
                const fileBuffer = await fs.promises.readFile(filePath);
                
                // Set up mock attachment
                mockContext.activity!.attachments = [{
                    name: path.basename(testFile.path),
                    contentUrl: `file://${filePath}`,
                    contentType: testFile.contentType
                }];

                // Upload file
                console.log('Uploading file...');
                const results = await fileHandler.handleFileUpload(mockContext as TurnContext);
                
                if (results[0].success) {
                    console.log('File uploaded successfully. Document ID:', results[0].documentId);

                    // Process with question
                    console.log(`Asking question: "${testFile.question}"`);
                    await fileHandler.processFileWithQuestion(
                        mockContext as TurnContext,
                        results[0].documentId,
                        testFile.question
                    );

                    // Try asking another question (should fail as file is removed after first question)
                    console.log('Trying second question (should fail)...');
                    await fileHandler.processFileWithQuestion(
                        mockContext as TurnContext,
                        results[0].documentId,
                        'Another question'
                    );
                } else {
                    console.error('File upload failed:', results[0].error);
                }
            } catch (error) {
                console.error(`Error processing ${testFile.path}:`, error);
            }

            console.log('=== Test completed ===\n');
        }

        // Clean up test CSV file
        fs.unlinkSync(csvPath);
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await fileHandler.cleanup();
    }
}

// Run the test
console.log('Starting file upload test...');
testFileUpload().then(() => {
    console.log('Test completed.');
}).catch(error => {
    console.error('Test failed:', error);
});
