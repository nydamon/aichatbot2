import { ActivityHandler } from 'botbuilder';
export interface SearchDocument {
    content: string;
    [key: string]: unknown;
}
export declare class TeamsBot extends ActivityHandler {
    private client;
    private searchClient;
    constructor();
    private handleIncomingMessage;
    private formatResponseForTeams;
    private handleMembersAdded;
    private checkMessageType;
    private isUserMessage;
    private logConversation;
}
