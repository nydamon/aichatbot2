# AI Chat Bot

A robust chatbot application leveraging OpenAI's GPT models with enhanced file handling and context management.

## Key Features

### Intelligent File Processing
- **ChatGPT-Powered Analysis**
  - All file types processed through GPT
  - Intelligent content interpretation
  - No manual parsing libraries
  - Unified handling across formats

### File Processing
- **Smart Context Management**
  - Maintains file context during conversations
  - Enhances questions with file-specific context
  - Prevents redundant clarification requests
  - Automatic context cleanup

- **Multi-Format Support**
  - Excel (.xlsx, .xls)
  - CSV (multiple delimiters)
  - PDF text extraction
  - Image analysis
  - Proper error handling

- **Data Analysis**
  - Spreadsheet visualization
  - Statistical calculations
  - Chart generation
  - Trend analysis

### Core Capabilities
- GPT-4 Integration
- Vision Processing (GPT-4V)
- Web Search Integration
- Image Generation (DALL-E 3)
- Text Embeddings
- Function Calling Support

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key
- Azure OpenAI subscription (optional)

### Installation
```bash
git clone https://github.com/yourusername/aichatbot.git
cd aichatbot
npm install
```

### Configuration
```bash
cp env/.env.example env/.env.dev
```
Edit `env/.env.dev` with your API keys and configuration.

### Running the Application
```bash
npm run dev
```

## Usage Examples

### File Processing
```typescript
// Upload and analyze file using GPT
const results = await fileHandler.handleFileUpload(context);
const documentId = results[0].documentId;

// Ask questions about the file
await fileHandler.processFileWithQuestion(
    context,
    documentId,
    'What are the key insights from this document?'
);
```

### Spreadsheet Analysis
```typescript
// Process Excel/CSV file using GPT
const chartData = await fileHandler.processExcelFile(fileBuffer);

// Generate insights
await fileHandler.generateChartResponse(
    context,
    chartData,
    'What is the total revenue by quarter?'
);
```

### PDF Processing
```typescript
// Analyze PDF using GPT
const analysis = await fileHandler.analyzeFile(fileBuffer, 'document.pdf');

// Ask questions about content
await fileHandler.processFileWithQuestion(
    context,
    documentId,
    'Summarize the main points'
);
```

## Testing

See [TESTING.md](TESTING.md) for comprehensive testing guidelines, including:
- ChatGPT integration requirements
- File context management
- Multi-format support
- Error handling patterns
- Common pitfalls to avoid

### Quick Start
```bash
# Run all tests
npm test

# Run specific test suite
npm test src/handlers/__tests__/FileHandler.test.ts

# Run with coverage
npm test -- --coverage
```

### Important Testing Notes
1. Always verify GPT is used for file processing
2. Test all supported file formats
3. Include error cases and recovery scenarios
4. Check cleanup procedures

## Best Practices

### File Handling
1. GPT Integration
   - Use GPT for all file processing
   - No manual parsing libraries
   - Unified handling across formats
   - Proper error recovery

2. Context Management
   - Store file metadata per conversation
   - Enhance questions with context
   - Clean up after processing
   - Handle multiple files properly

3. Error Handling
   - Provide clear error messages
   - Attempt format recovery
   - Clean up on failures
   - Log debugging info

### Development Workflow
1. Write tests first
2. Implement features using GPT
3. Verify context handling
4. Document changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Implement your changes using GPT for file handling
5. Run all tests (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

Please review our [Testing Guidelines](TESTING.md) before submitting changes.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
