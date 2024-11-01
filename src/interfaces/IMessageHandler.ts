import { TurnContext } from 'botbuilder';
import { ChatMessage } from '../types/ChatTypes';

export interface IMessageHandler {
    handleMessage(context: TurnContext): Promise<void>;
    handleGeneralQuery(context: TurnContext, history: ChatMessage[]): Promise<void>;
    handleFileQuery(context: TurnContext, history: ChatMessage[]): Promise<void>;
}
