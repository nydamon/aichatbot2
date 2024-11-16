# The Credit Pros Teams ChatGPT Bot

A Microsoft Teams bot powered by Azure OpenAI that helps The Credit Pros team members find information and get assistance with various tasks.

## Features

- Natural language conversations using Azure OpenAI
- File handling and document processing
- Image analysis capabilities
- Excel file processing
- Teams integration with personal, team, and group chat support

## Technical Stack

- Node.js
- Azure Bot Framework
- Azure OpenAI
- Microsoft Teams SDK
- Azure App Service for hosting

## Deployment

The bot is automatically deployed using GitHub Actions to Azure App Service. Updates to the Teams app package are also automated through GitHub Actions workflows.

## Environment Setup

The bot requires the following environment variables:
- MICROSOFT_APP_ID
- MICROSOFT_APP_PASSWORD
- Other Azure OpenAI and service configurations

## Development

To run the bot locally:
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the bot: `npm start`

## Teams Integration

The bot can be installed in Microsoft Teams and provides the following commands:
- help: Learn how to use the bot
- process image: Analyze images
- process excel: Handle Excel file data
- process file: Process various document types

## Security

- Private repository
- Secure credential management through GitHub Secrets
- Azure AD authentication
