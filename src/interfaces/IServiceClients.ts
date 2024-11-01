import { OpenAIClient } from '@azure/openai';
import { SearchClient } from '@azure/search-documents';
import { BlobServiceClient } from '@azure/storage-blob';
import { SearchDocument } from '../types/SearchTypes';

export interface IServiceClients {
    openAIClient: OpenAIClient;
    searchClient: SearchClient<SearchDocument>;
    blobClient: BlobServiceClient;
}
