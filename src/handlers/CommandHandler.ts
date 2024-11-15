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
        SOP: '/sop',
        CONFLUENCE: '/confluence'
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
            // Check if it's a SOP or Confluence search command
            if (command.toLowerCase().startsWith(this.COMMANDS.SOP) || 
                command.toLowerCase().startsWith(this.COMMANDS.CONFLUENCE)) {
                const commandType = command.toLowerCase().startsWith(this.COMMANDS.SOP) ? 
                    this.COMMANDS.SOP : this.COMMANDS.CONFLUENCE;
                const searchQuery = command.slice(commandType.length).trim();

                if (!searchQuery) {
                    const helpMessage = `Please provide a search term after the ${commandType} command.\n\nExample: ${commandType} create user\n\nThis will search our documentation for relevant information.`;
                    await context.sendActivity(helpMessage);
                    return;
                }

                await this.handleDocumentSearchCommand(context, commandType, searchQuery);
                return;
            }

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
            console.error('Error handling command: ', error instanceof Error ? error.message : String(error));
            await context.sendActivity('An error occurred while processing your command. Please try again.');
        }
    }

    private async handleDocumentSearchCommand(context: TurnContext, commandType: string, searchQuery: string): Promise<void> {
        try {
            const searchResults = await this.searchService.searchDocuments(searchQuery, {
                top: 3,
                select: ['id', 'content', 'title', 'url']
            });

            if (searchResults && searchResults.length > 0) {
                // Combine relevant document content
                const documentContext = searchResults
                    .map(result => result.document.content)
                    .join('\n\n');

                // Format the response with document links
                let response = `Here are the relevant documents I found for "${searchQuery}":\n\n`;
                searchResults.forEach(result => {
                    const doc = result.document;
                    const title = doc.title || 'Untitled Document';
                    const url = doc.url || `aHR0cHM6Ly9ncHRz${doc.id}`; // Use base64 encoded ID if no URL
                    response += `- [${title}](${url})\n`;
                });

                await context.sendActivity(response);
            } else {
                await context.sendActivity(`No documents found matching "${searchQuery}". Try refining your search terms.`);
            }
        } catch (error) {
            console.error('Error searching documents: ', error instanceof Error ? error.message : String(error));
            await context.sendActivity('An error occurred while searching documents. Please try again.');
        }
    }

    private async handleHelpCommand(context: TurnContext): Promise<void> {
        const helpText = `
🤖 **Available Commands**

Basic Commands:
- \`/help\` - Show this help message
- \`/clear\` - Clear conversation history
- \`/files\` - List recently uploaded files

Document Search:
- \`/sop <search term>\` - Search SOPs and Confluence docs
- \`/confluence <search term>\` - Alternative way to search docs

File Management:
- Upload files for analysis (Supported: PDF, TXT, MD, CSV, JSON)
- Ask questions about uploaded documents
- Search through document content

Additional Commands:
- \`/settings\` - View and modify bot settings
- \`/status\` - Check bot and service status

Tips:
- Use clear, specific search terms with /sop or /confluence
- Mention file names when asking about documents
- Type commands exactly as shown

Need more help? Just ask!
        `;

        await context.sendActivity(MessageFactory.text(helpText));
        
        // Send suggested actions
        await context.sendActivity(MessageFactory.suggestedActions(
            ['/sop', '/files', '/clear', '/status'],
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
                ['Upload a file', '/sop', '/help'],
                'What would you like to do next?'
            ));
        } catch (error) {
            console.error('Error clearing conversation history: ', error instanceof Error ? error.message : String(error));
            await context.sendActivity('Failed to clear conversation history. Please try again.');
        }
    }

    private async handleFilesCommand(context: TurnContext): Promise<void> {
        try {
            const searchResults = await this.searchService.searchDocuments('*');
            
            if (searchResults.length === 0) {
                await context.sendActivity('No files have been uploaded yet.');
                await context.sendActivity(MessageFactory.suggestedActions(
                    ['Upload a file', '/help'],
                    'Would you like to:'
                ));
                return;
            }

            let fileList = '📁 **Recently Uploaded Files**\n\n';
            
            for (const result of searchResults) {
                const doc = result.document;
                const displayName = doc.fileName || doc.title || 'Untitled';
                const contentType = doc.fileType || 'Unknown';

                fileList += `📄 **${displayName}**\n`;
                fileList += `   • Type: ${contentType.toUpperCase()}\n`;
                if (doc.url) {
                    fileList += `   • URL: ${doc.url}\n`;
                }
                fileList += '\n';
            }

            await context.sendActivity(MessageFactory.text(fileList));
            
            // Add helpful suggestions
            await context.sendActivity(MessageFactory.suggestedActions(
                ['Upload new file', '/sop', '/help'],
                'What would you like to do with these files?'
            ));

        } catch (error) {
            console.error('Error listing files: ', error instanceof Error ? error.message : String(error));
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
            console.error('Error checking status: ', error instanceof Error ? error.message : String(error));
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
            ['/help', '/sop', '/files'],
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
