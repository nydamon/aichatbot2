import { ActivityHandler, TurnContext } from 'botbuilder';
export declare class TeamsBot extends ActivityHandler {
    private client;
    constructor();
    run(context: TurnContext): Promise<void>;
    private handleIncomingMessage;
    private formatResponseForTeams;
    private handleMembersAdded;
}
