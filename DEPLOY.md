# Deployment Guide for The Credit Pros Teams Bot

This guide explains how to set up continuous deployment using GitHub Actions to Azure.

## Prerequisites

1. Azure subscription
2. GitHub repository with the bot code
3. Microsoft Teams admin access

## Setup Steps

### 1. Create Azure Resources

1. Create an Azure Bot Service:
   ```bash
   az group create --name creditpros-bot-rg --location eastus
   az bot create --resource-group creditpros-bot-rg --name creditpros-teams-bot --kind webapp --sku F0 --microsoft-app-id <your-bot-id>
   ```

2. Create an Azure Web App:
   ```bash
   az webapp create --resource-group creditpros-bot-rg --plan creditpros-bot-plan --name creditpros-teams-bot --runtime "node|18-lts"
   ```

### 2. Configure GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" > "Actions"
3. Add the following secrets:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Get this from Azure Portal
     - Go to your Web App
     - Download Publish Profile
     - Copy the entire content into this secret

### 3. Update Bot Configuration

1. Update the manifest.json with your Azure Bot ID:
   ```json
   {
     "bots": [
       {
         "botId": "<your-bot-id>"
       }
     ]
   }
   ```

2. Configure environment variables in Azure:
   - Go to Azure Web App Configuration
   - Add all required environment variables from your .env file

### 4. Enable Continuous Deployment

1. Push the code to your GitHub repository
2. The GitHub Actions workflow will automatically:
   - Build the project
   - Run tests
   - Deploy to Azure Web App

### 5. Publish to Teams

1. Package your Teams app:
   ```bash
   # Install Teams toolkit if not already installed
   npm install -g @microsoft/teamsfx-cli

   # Package the app
   teamsfx package
   ```

2. Upload to Teams Admin Center:
   - Go to Teams Admin Center
   - Navigate to "Teams apps" > "Manage apps"
   - Click "Upload new app"
   - Upload the generated .zip package

## Updating the Bot

1. Make changes to your code
2. Push to the main branch
3. GitHub Actions will automatically deploy the updates
4. Users will get the updates automatically without reinstalling

## Monitoring

- Monitor deployments in GitHub Actions tab
- Check Azure Web App logs for runtime issues
- Use Application Insights for detailed monitoring

## Troubleshooting

1. If deployment fails:
   - Check GitHub Actions logs
   - Verify Azure credentials are correct
   - Ensure all environment variables are set

2. If bot is not responding:
   - Check Azure Web App logs
   - Verify Bot Service configuration
   - Check environment variables in Azure

3. For Teams-specific issues:
   - Verify bot registration in Azure
   - Check Teams Admin Center for app status
   - Review Teams activity logs

## Support

For issues or questions:
- Check Azure Bot Service documentation
- Review Microsoft Teams app documentation
- Contact Azure support for platform-specific issues
