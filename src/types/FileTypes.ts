export interface FileUploadResult {
    success: boolean;
    content?: string;
    error?: string;
}

export interface FileAnalysisResult {
    summary: string;
    type: string;
    confidence: number;
}
