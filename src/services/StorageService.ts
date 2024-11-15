import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions, SASProtocol } from '@azure/storage-blob';
import { azureStorageConfig } from '../config/azure-config';

export class StorageService {
    private client: BlobServiceClient;
    private sharedKeyCredential: StorageSharedKeyCredential;

    constructor() {
        try {
            if (!azureStorageConfig.accountName || !azureStorageConfig.key) {
                throw new Error('Azure Storage configuration missing');
            }

            this.sharedKeyCredential = new StorageSharedKeyCredential(
                azureStorageConfig.accountName,
                azureStorageConfig.key
            );

            this.client = new BlobServiceClient(
                `https://${azureStorageConfig.accountName}.blob.core.windows.net`,
                this.sharedKeyCredential
            );

            console.log('StorageService initialized successfully');
        } catch (error) {
            console.error('Error initializing StorageService:', error);
            throw error;
        }
    }

    async uploadFile(containerName: string, fileName: string, content: Buffer): Promise<string> {
        try {
            const container = this.client.getContainerClient(containerName);
            await container.createIfNotExists();

            const blob = container.getBlockBlobClient(fileName);
            await blob.upload(content, content.length);

            // Generate SAS URL that expires in 5 minutes
            const sasUrl = await this.generateSasUrl(containerName, fileName);
            return sasUrl;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw new Error('Failed to upload file');
        }
    }

    async downloadFile(containerName: string, fileName: string): Promise<Buffer> {
        try {
            const container = this.client.getContainerClient(containerName);
            const blob = container.getBlockBlobClient(fileName);

            const downloadResponse = await blob.download(0);
            const chunks: Buffer[] = [];

            if (downloadResponse.readableStreamBody) {
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(Buffer.from(chunk));
                }
            }

            return Buffer.concat(chunks);
        } catch (error) {
            console.error('Error downloading file:', error);
            throw new Error('Failed to download file');
        }
    }

    async deleteFile(containerName: string, fileName: string): Promise<void> {
        try {
            const container = this.client.getContainerClient(containerName);
            const blob = container.getBlockBlobClient(fileName);
            await blob.delete();
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new Error('Failed to delete file');
        }
    }

    async listFiles(containerName: string): Promise<string[]> {
        try {
            const container = this.client.getContainerClient(containerName);
            const files: string[] = [];

            for await (const blob of container.listBlobsFlat()) {
                files.push(blob.name);
            }

            return files;
        } catch (error) {
            console.error('Error listing files:', error);
            throw new Error('Failed to list files');
        }
    }

    async getFileUrl(containerName: string, fileName: string): Promise<string> {
        try {
            return await this.generateSasUrl(containerName, fileName);
        } catch (error) {
            console.error('Error getting file URL:', error);
            throw new Error('Failed to get file URL');
        }
    }

    async fileExists(containerName: string, fileName: string): Promise<boolean> {
        try {
            const container = this.client.getContainerClient(containerName);
            const blob = container.getBlockBlobClient(fileName);
            return await blob.exists();
        } catch (error) {
            console.error('Error checking file existence:', error);
            throw new Error('Failed to check file existence');
        }
    }

    private async generateSasUrl(containerName: string, fileName: string): Promise<string> {
        const container = this.client.getContainerClient(containerName);
        const blob = container.getBlockBlobClient(fileName);

        const startsOn = new Date();
        const expiresOn = new Date(startsOn);
        expiresOn.setMinutes(startsOn.getMinutes() + 5); // URL expires in 5 minutes

        const sasOptions = {
            containerName,
            blobName: fileName,
            permissions: BlobSASPermissions.parse("r"), // Read-only permission
            startsOn,
            expiresOn,
            protocol: SASProtocol.Https
        };

        const sasToken = generateBlobSASQueryParameters(
            sasOptions,
            this.sharedKeyCredential
        ).toString();

        return `${blob.url}?${sasToken}`;
    }
}
