import { StorageService } from '../StorageService';
import { azureStorageConfig } from '../../config/azure-config';

describe('StorageService Live Tests', () => {
    let service: StorageService;
    const testFileName = `temp-test-file-${Date.now()}.txt`;
    const testContent = Buffer.from('This is a test file content');
    const tempContainer = 'temp-attachments';

    beforeAll(() => {
        service = new StorageService();
    });

    describe('Storage Operations', () => {
        it('should upload a file successfully', async () => {
            const url = await service.uploadFile(
                tempContainer,
                testFileName,
                testContent
            );
            expect(url).toBeTruthy();
            expect(url).toContain(testFileName);
        });

        it('should check if file exists', async () => {
            const exists = await service.fileExists(
                tempContainer,
                testFileName
            );
            expect(exists).toBe(true);
        });

        it('should get file URL', async () => {
            const url = await service.getFileUrl(
                tempContainer,
                testFileName
            );
            expect(url).toBeTruthy();
            expect(url).toContain(testFileName);
        });

        it('should list files and include test file', async () => {
            const files = await service.listFiles(tempContainer);
            expect(Array.isArray(files)).toBe(true);
            expect(files).toContain(testFileName);
        });

        it('should download file and verify content', async () => {
            const downloadedContent = await service.downloadFile(
                tempContainer,
                testFileName
            );
            expect(Buffer.compare(downloadedContent, testContent)).toBe(0);
        });

        it('should handle download failures', async () => {
            // Try to download a non-existent file
            await expect(service.downloadFile(
                tempContainer,
                'non-existent-file.txt'
            )).rejects.toThrow('Failed to download file');
        });

        it('should delete file successfully', async () => {
            await service.deleteFile(tempContainer, testFileName);
            const exists = await service.fileExists(
                tempContainer,
                testFileName
            );
            expect(exists).toBe(false);
        });

        it('should handle delete of non-existent file', async () => {
            await expect(service.deleteFile(
                tempContainer,
                'non-existent-file.txt'
            )).rejects.toThrow('Failed to delete file');
        });
    });

    afterAll(async () => {
        // Clean up any remaining test files
        try {
            const files = await service.listFiles(tempContainer);
            for (const file of files) {
                if (file.startsWith('temp-test-file-')) {
                    await service.deleteFile(tempContainer, file);
                }
            }
        } catch (error) {
            console.error('Error cleaning up test files:', error);
        }
    });
});
