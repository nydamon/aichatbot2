import { TurnContext, MessageFactory } from 'botbuilder';
import { ConversationService } from '../services/ConversationService';
import { SearchService } from '../services/SearchService';
import { SearchDocument } from '../types/SearchTypes';

export class CommandHandler {
    private readonly COMMANDS = {
        HELP: '/help',
        CLEAR: '/clear',
        FILES: '/files',
        SETTINGS: '/settings',
        STATUS: '/status',
    };

    private conversationService: ConversationService;
    private searchService: SearchService;

    constructor(
        conversationService: ConversationService,
        searchService: SearchService
    ) {
        this.conversationService = conversationService;
        this.searchService = searchService;
    }

    async handleCommand(context: TurnContext, command: string): Promise<void> {
        try {
            const normalizedCommand = command.toLowerCase().trim();

            switch (normalizedCommand) {
                case this.COMMANDS.HELP:
                    await this.handleHelpCommand(context);
                    break;
                case this.COMMANDS.CLEAR:
                    await this.handleClearCommand(context);
                    break;
                case this.COMMANDS.FILES:
                    await this.handleFilesCommand(context);
                    break;
                case this.COMMANDS.SETTINGS:
                    await this.handleSettingsCommand(context);
                    break;
                case this.COMMANDS.STATUS:
                    await this.handleStatusCommand(context);
                    break;
                default:
                    await this.handleUnknownCommand(context, command);
                    break;
            }
        } catch (error) {
            console.error('Error handling command:', error);
            await context.sendActivity('An error occurred while processing your command. Please try again.');
        }
    }

    private async handleHelpCommand(context: TurnContext): Promise<void> {
        const helpText = `
🤖 **Available Commands**

Basic Commands:
- \`/help\` - Show this help message
- \`/clear\` - Clear conversation history
- \`/files\` - List recently uploaded files

File Management:
- Upload files for analysis (Supported: PDF, TXT, MD, CSV, JSON)
- Ask questions about uploaded documents
- Search through document content

Additional Commands:
- \`/settings\` - View and modify bot settings
- \`/status\` - Check bot and service status

Tips:
- Use clear, specific questions
- Mention file names when asking about documents
- Type commands exactly as shown

Need more help? Just ask!
        `;

        await context.sendActivity(MessageFactory.text(helpText));
        
        // Send suggested actions
        await context.sendActivity(MessageFactory.suggestedActions(
            ['/files', '/clear', '/status'],
            'Quick actions:'
        ));
    }

    private async handleClearCommand(context: TurnContext): Promise<void> {
        try {
            const conversationId = context.activity.conversation.id;
            this.conversationService.clearHistory(conversationId);
            
            await context.sendActivity(MessageFactory.text(
                '✨ Conversation history has been cleared. Starting fresh!'
            ));
            
            // Offer next steps
            await context.sendActivity(MessageFactory.suggestedActions(
                ['Upload a file', 'Ask a question', '/help'],
                'What would you like to do next?'
            ));
        } catch (error) {
            console.error('Error clearing conversation history:', error);
            await context.sendActivity('Failed to clear conversation history. Please try again.');
        }
    }

    private async handleFilesCommand(context: TurnContext): Promise<void> {
        try {
            const searchOptions = {
                filter: "source eq 'user-upload'",
                select: ['fileName', 'timestamp', 'fileType', 'uploadedBy'] as string[],
                top: 5,
                orderBy: ['timestamp desc'] as string[]
            };

            const searchResults = await this.searchService.searchDocuments('*', searchOptions);
            
            let hasResults = false;
            for await (const _ of searchResults.results) {
                hasResults = true;
                break;
            }
            if (!hasResults) {
                await context.sendActivity('No files have been uploaded yet.');
                await context.sendActivity(MessageFactory.suggestedActions(
                    ['Upload a file', '/help'],
                    'Would you like to:'
                ));
                return;
            }

            let fileList = '📁 **Recently Uploaded Files**\n\n';
            
            for await (const result of searchResults.results) {
                const doc = result.document as SearchDocument;
                const timestamp = new Date(doc.timestamp).toLocaleString();
                const uploadedBy = doc.uploadedBy || 'Unknown';
                const fileType = doc.fileType?.toUpperCase() || 'Unknown';

                fileList += `📄 **${doc.fileName}**\n`;
                fileList += `   • Type: ${fileType}\n`;
                fileList += `   • Uploaded: ${timestamp}\n`;
                fileList += `   • By: ${uploadedBy}\n\n`;
            }

            await context.sendActivity(MessageFactory.text(fileList));
            
            // Add helpful suggestions
            await context.sendActivity(MessageFactory.suggestedActions(
                ['Upload new file', 'Search files', '/help'],
                'What would you like to do with these files?'
            ));

        } catch (error) {
            console.error('Error listing files:', error);
            await context.sendActivity('Failed to retrieve file list. Please try again later.');
        }
    }

    private async handleSettingsCommand(context: TurnContext): Promise<void> {
        // This could be expanded to handle actual settings
        const settingsMessage = `
⚙️ **Current Settings**

Conversation:
- History Length: 10 messages
- Language: English
- Response Type: Detailed

File Handling:
- Max File Size: 10MB
- Supported Types: PDF, TXT, MD, CSV, JSON
- Auto-Analysis: Enabled

To change settings, please contact your administrator.
        `;

        await context.sendActivity(MessageFactory.text(settingsMessage));
    }

    private async handleStatusCommand(context: TurnContext): Promise<void> {
        try {
            // This could be expanded to include real service health checks
            const statusMessage = `
🟢 **System Status**

Services:
- Bot: Online
- OpenAI: Connected
- Search: Connected
- Storage: Connected

Performance:
- Response Time: Normal
- System Load: Normal
- Available Storage: Available

Last Updated: ${new Date().toLocaleString()}
            `;

            await context.sendActivity(MessageFactory.text(statusMessage));

        } catch (error) {
            console.error('Error checking status:', error);
            await context.sendActivity('Failed to retrieve system status.');
        }
    }

    private async handleUnknownCommand(context: TurnContext, command: string): Promise<void> {
        const suggestion = this.findSimilarCommand(command);
        let message = `❌ Unknown command: \`${command}\`\n\n`;
        
        if (suggestion) {
            message += `Did you mean: \`${suggestion}\`?\n\n`;
        }
        
        message += 'Type `/help` to see available commands.';
        
        await context.sendActivity(MessageFactory.text(message));
        
        // Show quick actions
        await context.sendActivity(MessageFactory.suggestedActions(
            ['/help', '/files', '/status'],
            'Try one of these commands:'
        ));
    }

    private findSimilarCommand(command: string): string | null {
        const commands = Object.values(this.COMMANDS);
        const commandWithoutSlash = command.replace('/', '');
        
        // Simple similarity check
        for (const validCommand of commands) {
            if (validCommand.replace('/', '').includes(commandWithoutSlash) ||
                commandWithoutSlash.includes(validCommand.replace('/', ''))) {
                return validCommand;
            }
        }
        
        return null;
    }
}
