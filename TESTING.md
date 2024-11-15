# Testing Guidelines

## Critical File Handling Patterns

### IMPORTANT: Use ChatGPT for All File Processing
CRITICAL: Always use ChatGPT's file handlers for all file types (PDF, Excel, CSV, etc.). This is a core architectural decision that must be followed in both tests and production code.

```typescript
// ❌ WRONG: Manual file parsing
const workbook = XLSX.read(buffer);
const data = XLSX.utils.sheet_to_json(workbook);

// ❌ WRONG: Using pdf-parse or other parsers
const pdfData = await pdfParse(buffer);

// ✅ RIGHT: Using ChatGPT for all file types
const messages = [
    {
        role: 'system',
        content: `You are analyzing a ${fileType} file...`
    },
    {
        role: 'user',
        content: `Analyze this file:\n${buffer.toString('base64')}`
    }
];
const analysis = await openAIService.getStreamingCompletion(messages);
```

### File Context Management
IMPORTANT: Always maintain context about uploaded files to provide appropriate responses. This was a source of bugs where the bot would ask for clarification about files it should already know about.

```typescript
// ❌ WRONG: Losing file context
async handleMessage(context: TurnContext) {
    const messageText = context.activity.text;
    // Direct response without context
    await this.openAIService.getCompletion(messageText);
}

// ✅ RIGHT: Maintaining file context
async handleMessage(context: TurnContext) {
    const conversationId = context.activity.conversation.id;
    const fileContext = this.fileContexts.get(conversationId);
    
    // Enhance question with file context
    if (fileContext) {
        const enhancedQuestion = `Regarding the ${fileContext.fileType} file "${fileContext.fileName}": ${messageText}`;
        // Process with context
    }
}
```

### Common Mistakes to Avoid

1. Manual File Parsing:
```typescript
// ❌ WRONG: Using format-specific libraries
import * as XLSX from 'xlsx';
import * as pdfParse from 'pdf-parse';

// ✅ RIGHT: Using ChatGPT for all formats
const analysis = await openAIService.analyzeFile(buffer, fileType);
```

2. Losing File Context:
```typescript
// ❌ WRONG: Asking for clarification about known files
User: "how many rows?"
Bot: "Could you please specify what you're referring to?"

// ✅ RIGHT: Using file context
User: "how many rows?"
Bot: "Analyzing the Excel file 'sales.xlsx': There are 150 rows..."
```

3. Missing File Type Support:
```typescript
// ❌ WRONG: Format-specific handling
if (file.endsWith('.xlsx')) {
    // Handle Excel only
}

// ✅ RIGHT: Universal file handling through ChatGPT
const analysis = await openAIService.analyzeFile(buffer, fileName);
```

### Required Testing Scenarios

1. File Analysis Tests:
```typescript
it('should use ChatGPT for all file types', async () => {
    const fileTypes = ['xlsx', 'csv', 'pdf', 'txt'];
    
    for (const type of fileTypes) {
        const result = await handler.analyzeFile(buffer, `test.${type}`);
        expect(openAIService.getStreamingCompletion).toHaveBeenCalled();
        expect(result.analysis).toBeDefined();
    }
});
```

2. Context Tests:
```typescript
it('should maintain file context between questions', async () => {
    // Upload file
    const fileContext = {
        fileName: 'data.xlsx',
        fileType: 'Excel',
        uploadTime: new Date()
    };
    handler.addFileContext(conversationId, fileContext);

    // First question
    await handler.handleMessage('how many rows?');
    // Second question
    await handler.handleMessage('what is the total?');

    // Verify both questions used file context
    expect(responses).toContain('Excel file');
});
```

3. Error Handling Tests:
```typescript
it('should handle file processing errors gracefully', async () => {
    const malformedCases = [
        Buffer.from('invalid data'),
        Buffer.from('corrupted content'),
        Buffer.from('malformed structure')
    ];

    for (const testCase of malformedCases) {
        const result = await handler.processFile(testCase);
        expect(result.error).toBeDefined();
        expect(result.error.message).toBeInformative();
    }
});
```

### Implementation Checklist

Before marking a file handling task as complete, verify:

1. ChatGPT Integration:
- [ ] All file types processed through ChatGPT
- [ ] No manual parsing libraries used
- [ ] Proper error handling for GPT responses
- [ ] Tests verify GPT usage

2. Context Management:
- [ ] File context stored per conversation
- [ ] Questions enhanced with file context
- [ ] Context cleared after processing
- [ ] Multiple files in session handled

3. Testing Coverage:
- [ ] Unit tests for each file type
- [ ] Integration tests for workflows
- [ ] Error case coverage
- [ ] Context maintenance tests

### Monitoring and Debugging

1. Add logging for file operations:
```typescript
logger.info('Processing file', {
    fileName,
    fileType,
    size,
    conversationId
});
```

2. Track context changes:
```typescript
logger.debug('File context updated', {
    conversationId,
    previousContext,
    newContext
});
```

3. Monitor error patterns:
```typescript
logger.error('File processing failed', {
    error,
    fileName,
    fileType,
    attemptNumber
});
```

### Recovery Procedures

1. Context Loss:
```typescript
// Recover context from session if available
if (!fileContext && sessionContent) {
    fileContext = this.reconstructContext(sessionContent);
}
```

2. File Processing Errors:
```typescript
try {
    await this.processFile(file);
} catch (error) {
    // Attempt recovery through GPT
    if (error.code === 'PROCESSING_FAILED') {
        return this.retryWithGPT(file);
    }
    throw error;
}
```

3. Session Cleanup:
```typescript
// Ensure cleanup happens even on errors
try {
    await this.processFileWithQuestion(context, documentId, question);
} finally {
    await this.cleanup(documentId);
}
```

Remember: 
1. ALWAYS use ChatGPT for file processing - this is a core architectural requirement
2. Never implement manual parsing - let GPT handle all file interpretation
3. Maintain proper file context throughout conversations
4. Test all file types through GPT handlers
