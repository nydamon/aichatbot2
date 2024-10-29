declare const config: {
    MicrosoftAppId: string | undefined;
    MicrosoftAppType: string | undefined;
    MicrosoftAppTenantId: string | undefined;
    MicrosoftAppPassword: string | undefined;
    azureOpenAI: {
        endpoint: string | undefined;
        apiKey: string | undefined;
        deploymentName: string | undefined;
    };
};
export default config;
