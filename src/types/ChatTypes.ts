export interface MessageContent {
    type: string;
    text?: string;
    image_url?: {
        url: string;
    };
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | MessageContent[];
}

export interface VisionMessage {
    role: string;
    content: string | MessageContent[];
}

export interface VisionRequestMessage extends VisionMessage {
    role: 'user';
    content: MessageContent[];  // Vision requests specifically require MessageContent[]
}

export interface ChatCompletionOptions {
    temperature?: number;
    maxTokens?: number;
    enableWebSearch?: boolean;
    model?: string;  // Added model property
}

export function isVisionRequestMessage(message: VisionMessage): message is VisionRequestMessage {
    return message.role === 'user' && Array.isArray(message.content);
}

export function isMessageContentArray(content: string | MessageContent[]): content is MessageContent[] {
    return Array.isArray(content);
}
