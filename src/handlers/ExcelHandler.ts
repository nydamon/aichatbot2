import { TurnContext, CardFactory, Attachment } from 'botbuilder';
import { OpenAIService } from '../services/OpenAIService';

export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
    }[];
}

interface CardBody {
    type: string;
    text?: string;
    size?: string;
    weight?: string;
    wrap?: boolean;
    facts?: { title: string; value: string; }[];
}

export class ExcelHandler {
    constructor(private openAIService: OpenAIService) {}

    public async processExcelFile(buffer: Buffer, fileName: string): Promise<ChartData | null> {
        try {
            if (!buffer || buffer.length === 0) {
                throw new Error('Empty file provided');
            }

            const content = buffer.toString('utf8');
            const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            if (lines.length < 2) {
                throw new Error('No data found in file');
            }

            // Let GPT interpret the file content
            const messages = [
                {
                    role: 'system' as const,
                    content: `You are a data parser. Given a spreadsheet-like file content, analyze it and return a JSON object with:
1. The labels (first non-numeric column or row identifiers)
2. The numeric data series (handle currency like $1,234.56, percentages like 50%, and parentheses for negatives like (500))

Return format:
{
    "labels": ["label1", "label2", ...],
    "datasets": [
        {
            "label": "series name",
            "data": [number1, number2, ...]
        },
        ...
    ]
}`
                },
                {
                    role: 'user' as const,
                    content: `Parse this data:\n${lines.join('\n')}`
                }
            ];

            let analysis = '';
            await this.openAIService.getStreamingCompletion(
                messages,
                async (content) => {
                    analysis += content;
                },
                { temperature: 0.1, maxTokens: 1000 }
            );

            return JSON.parse(analysis);
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    }

    public createChartCard(chartData: ChartData, question?: string): Attachment {
        const cardBody: CardBody[] = [
            {
                type: 'TextBlock',
                text: question ? `Analysis for: ${question}` : 'Data Analysis',
                size: 'Large',
                weight: 'Bolder',
                wrap: true
            }
        ];

        // Add data summary
        const summary: CardBody[] = [];
        for (const dataset of chartData.datasets) {
            const values = dataset.data;
            const stats = {
                label: dataset.label,
                total: values.reduce((a, b) => a + b, 0),
                average: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };

            summary.push({
                type: 'FactSet',
                facts: [
                    {
                        title: `${stats.label} Total`,
                        value: stats.total.toFixed(2)
                    },
                    {
                        title: `${stats.label} Average`,
                        value: stats.average.toFixed(2)
                    },
                    {
                        title: `${stats.label} Range`,
                        value: `${stats.min.toFixed(2)} - ${stats.max.toFixed(2)}`
                    }
                ]
            });
        }

        cardBody.push(...summary);

        return CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.3',
            body: cardBody
        });
    }

    public async generateChartResponse(context: TurnContext, chartData: ChartData | null, question?: string): Promise<void> {
        if (!chartData || chartData.datasets.length === 0) {
            await context.sendActivity('No numeric data found to analyze.');
            return;
        }

        // Create and send the chart card
        const card = this.createChartCard(chartData, question);
        await context.sendActivity({ attachments: [card] });

        // If there's a question, analyze the data
        if (question) {
            const analysis = await this.analyzeData(chartData, question);
            if (analysis) {
                await context.sendActivity(analysis);
            }
        }
    }

    private async analyzeData(chartData: ChartData, question: string): Promise<string> {
        try {
            // Format data for analysis
            const dataDescription = chartData.datasets.map(dataset => {
                const stats = {
                    total: dataset.data.reduce((a, b) => a + b, 0),
                    average: dataset.data.reduce((a, b) => a + b, 0) / dataset.data.length,
                    min: Math.min(...dataset.data),
                    max: Math.max(...dataset.data)
                };

                return `${dataset.label}:
                    - Total: ${stats.total}
                    - Average: ${stats.average}
                    - Range: ${stats.min} to ${stats.max}
                    - Values: ${dataset.data.join(', ')}`;
            }).join('\n');

            const messages = [
                {
                    role: 'system' as const,
                    content: `You are analyzing numerical data with these statistics:\n${dataDescription}`
                },
                {
                    role: 'user' as const,
                    content: question
                }
            ];

            let analysis = '';
            await this.openAIService.getStreamingCompletion(
                messages,
                async (content) => {
                    analysis += content;
                },
                { temperature: 0.3, maxTokens: 500 }
            );

            return analysis;
        } catch (error) {
            console.error('Error analyzing data:', error);
            return 'Unable to analyze the data at this time.';
        }
    }
}
