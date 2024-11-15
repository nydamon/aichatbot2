import { ExcelHandler } from '../ExcelHandler';
import { OpenAIService } from '../../services/OpenAIService';
import { TurnContext } from 'botbuilder';
import { ChartData } from '../ExcelHandler';

jest.mock('../../services/OpenAIService');

describe('ExcelHandler', () => {
    let handler: ExcelHandler;
    let mockOpenAIService: jest.Mocked<OpenAIService>;
    let mockContext: Partial<TurnContext>;

    beforeEach(() => {
        mockOpenAIService = {
            getStreamingCompletion: jest.fn().mockImplementation(async (messages, callback) => {
                // Mock the data parsing response based on the input
                const content = messages[1].content;
                let response;

                if (messages[0].content.includes('analyzing numerical data')) {
                    await callback('Test analysis');
                    return;
                }

                if (content.includes('Name,Category')) {
                    response = {
                        labels: ['Item1', 'Item2'],
                        datasets: []
                    };
                } else if (content.includes('$1,234.56')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar'],
                        datasets: [{
                            label: 'Amount',
                            data: [1234.56, -500, 2000]
                        }]
                    };
                } else if (content.includes('2024-01-01')) {
                    response = {
                        labels: ['2024-01-01', '2024-01-02', '2024-01-03'],
                        datasets: [{
                            label: 'Value',
                            data: [100, 200, 300]
                        }]
                    };
                } else if (content.includes('50%')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar'],
                        datasets: [{
                            label: 'Rate',
                            data: [0.5, 0.75, 1.0]
                        }]
                    };
                } else if (content.includes('extra')) {
                    response = {
                        labels: ['Feb', 'Mar'],
                        datasets: [
                            {
                                label: 'Sales',
                                data: [150, 200]
                            },
                            {
                                label: 'Profit',
                                data: [75, 100]
                            }
                        ]
                    };
                } else if (content.includes('invalid')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar'],
                        datasets: [{
                            label: 'Value',
                            data: [100, 0, 300]
                        }]
                    };
                } else if (content.includes('Month,Sales,Profit\nJanuary')) {
                    response = {
                        labels: ['January', 'February', 'March'],
                        datasets: [
                            {
                                label: 'Sales',
                                data: [100, 150, 200]
                            },
                            {
                                label: 'Profit',
                                data: [50, 75, 100]
                            }
                        ]
                    };
                } else if (content.includes('Month,Sales,Profit\nJan')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar'],
                        datasets: [
                            {
                                label: 'Sales',
                                data: [100, 150, 200]
                            },
                            {
                                label: 'Profit',
                                data: [50, 75, 100]
                            }
                        ]
                    };
                } else if (content.includes('Month;Sales;Profit')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar'],
                        datasets: [
                            {
                                label: 'Sales',
                                data: [100, 150, 200]
                            },
                            {
                                label: 'Profit',
                                data: [50, 75, 100]
                            }
                        ]
                    };
                } else if (content.includes('Name,Value')) {
                    response = {
                        labels: ['Smith, John', 'Doe, Jane'],
                        datasets: [{
                            label: 'Value',
                            data: [100, 200]
                        }]
                    };
                } else if (content.includes('\t')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar'],
                        datasets: [
                            {
                                label: 'Sales',
                                data: [100, 150, 200]
                            },
                            {
                                label: 'Profit',
                                data: [50, 75, 100]
                            }
                        ]
                    };
                } else if (content.includes('Month,Value\nJan,$1000')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
                        datasets: [{
                            label: 'Value',
                            data: [1000, 20, -300, 400.5]
                        }]
                    };
                } else if (content.includes('Month,Value\nJan,100\nFeb,\nMar,300\nApr,')) {
                    response = {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
                        datasets: [{
                            label: 'Value',
                            data: [100, 0, 300, 0]
                        }]
                    };
                } else {
                    response = {
                        labels: [],
                        datasets: []
                    };
                }

                await callback(JSON.stringify(response));
                return;
            })
        } as unknown as jest.Mocked<OpenAIService>;

        handler = new ExcelHandler(mockOpenAIService);

        mockContext = {
            sendActivity: jest.fn().mockResolvedValue({ id: '1' })
        };
    });

    describe('processExcelFile', () => {
        it('should process Excel file with numeric data', async () => {
            const buffer = Buffer.from('Month,Sales,Profit\nJanuary,100,50\nFebruary,150,75\nMarch,200,100');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.labels).toEqual(['January', 'February', 'March']);
                expect(chartData.datasets).toHaveLength(2); // Two numeric columns (Sales, Profit)
                expect(chartData.datasets[0].label).toBe('Sales');
                expect(chartData.datasets[0].data).toEqual([100, 150, 200]);
                expect(chartData.datasets[1].label).toBe('Profit');
                expect(chartData.datasets[1].data).toEqual([50, 75, 100]);
            }
        });

        it('should handle Excel file with no numeric data', async () => {
            const buffer = Buffer.from('Name,Category\nItem1,A\nItem2,B');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets).toHaveLength(0);
            }
        });

        it('should handle empty Excel file', async () => {
            const buffer = Buffer.from('');
            await expect(handler.processExcelFile(buffer, 'test.csv')).rejects.toThrow();
        });

        it('should handle invalid file format', async () => {
            const buffer = Buffer.from('invalid data');
            await expect(handler.processExcelFile(buffer, 'test.xyz')).rejects.toThrow();
        });

        it('should process CSV file with comma delimiter', async () => {
            const buffer = Buffer.from('Month,Sales,Profit\nJan,100,50\nFeb,150,75\nMar,200,100');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.labels).toEqual(['Jan', 'Feb', 'Mar']);
                expect(chartData.datasets).toHaveLength(2);
                expect(chartData.datasets[0].label).toBe('Sales');
                expect(chartData.datasets[0].data).toEqual([100, 150, 200]);
            }
        });

        it('should process CSV file with semicolon delimiter', async () => {
            const buffer = Buffer.from('Month;Sales;Profit\nJan;100;50\nFeb;150;75\nMar;200;100');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.labels).toEqual(['Jan', 'Feb', 'Mar']);
                expect(chartData.datasets).toHaveLength(2);
                expect(chartData.datasets[0].label).toBe('Sales');
                expect(chartData.datasets[0].data).toEqual([100, 150, 200]);
            }
        });

        it('should process CSV with quoted fields containing delimiters', async () => {
            const buffer = Buffer.from('Name,Value\n"Smith, John",100\n"Doe, Jane",200');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.labels).toEqual(['Smith, John', 'Doe, Jane']);
                expect(chartData.datasets).toHaveLength(1);
                expect(chartData.datasets[0].data).toEqual([100, 200]);
            }
        });

        it('should handle CSV with currency and parentheses format', async () => {
            const buffer = Buffer.from('Month,Amount\nJan,$1,234.56\nFeb,(500.00)\nMar,2000');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets[0].data).toEqual([1234.56, -500, 2000]);
            }
        });

        it('should process TSV file format', async () => {
            const buffer = Buffer.from('Month\tSales\tProfit\nJan\t100\t50\nFeb\t150\t75\nMar\t200\t100');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.labels).toEqual(['Jan', 'Feb', 'Mar']);
                expect(chartData.datasets).toHaveLength(2);
                expect(chartData.datasets[0].label).toBe('Sales');
                expect(chartData.datasets[0].data).toEqual([100, 150, 200]);
            }
        });

        it('should handle mixed number formats in the same column', async () => {
            const buffer = Buffer.from('Month,Value\nJan,$1000\nFeb,2000%\nMar,(300)\nApr,400.5');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets[0].data).toEqual([1000, 20, -300, 400.5]);
            }
        });

        it('should handle percentage values', async () => {
            const buffer = Buffer.from('Month,Rate\nJan,50%\nFeb,75%\nMar,100%');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets[0].data).toEqual([0.5, 0.75, 1]);
            }
        });

        it('should handle empty cells between valid data', async () => {
            const buffer = Buffer.from('Month,Value\nJan,100\nFeb,\nMar,300\nApr,');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets[0].data).toEqual([100, 0, 300, 0]);
            }
        });

        it('should handle date values', async () => {
            const buffer = Buffer.from('Date,Value\n2024-01-01,100\n2024-01-02,200\n2024-01-03,300');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
                expect(chartData.datasets[0].data).toEqual([100, 200, 300]);
            }
        });

        it('should attempt recovery with different delimiters', async () => {
            // First try with comma fails due to inconsistent columns, should fall back to semicolon
            const buffer = Buffer.from('Month,Sales,Profit\nJan,100,50,extra\nFeb;150;75\nMar;200;100');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets[0].data).toEqual([150, 200]);
                expect(chartData.datasets[1].data).toEqual([75, 100]);
            }
        });

        it('should handle malformed data within valid file', async () => {
            const buffer = Buffer.from('Month,Value\nJan,100\nFeb,invalid\nMar,300');
            const chartData = await handler.processExcelFile(buffer, 'test.csv');

            expect(chartData).not.toBeNull();
            if (chartData) {
                expect(chartData.datasets[0].data).toEqual([100, 0, 300]);
            }
        });
    });

    describe('generateChartResponse', () => {
        it('should handle empty data', async () => {
            const emptyData: ChartData = {
                labels: [],
                datasets: []
            };

            await handler.generateChartResponse(mockContext as TurnContext, emptyData);

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                'No numeric data found to analyze.'
            );
        });

        it('should create chart card', async () => {
            const chartData: ChartData = {
                labels: ['Jan', 'Feb', 'Mar'],
                datasets: [{
                    label: 'Sales',
                    data: [100, 150, 200]
                }]
            };

            await handler.generateChartResponse(mockContext as TurnContext, chartData);

            expect(mockContext.sendActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    attachments: expect.arrayContaining([
                        expect.objectContaining({
                            content: expect.objectContaining({
                                body: expect.arrayContaining([
                                    expect.objectContaining({
                                        text: 'Data Analysis'
                                    })
                                ])
                            })
                        })
                    ])
                })
            );
        });

        it('should include analysis when question is provided', async () => {
            const chartData: ChartData = {
                labels: ['Jan', 'Feb', 'Mar'],
                datasets: [{
                    label: 'Sales',
                    data: [100, 150, 200]
                }]
            };

            await handler.generateChartResponse(mockContext as TurnContext, chartData, 'What is the total sales?');

            expect(mockOpenAIService.getStreamingCompletion).toHaveBeenCalled();
            expect(mockContext.sendActivity).toHaveBeenCalledWith('Test analysis');
        });
    });
});
