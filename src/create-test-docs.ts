import * as fs from 'fs';
import * as path from 'path';

// Sample content for different document types
const sampleDocs = [
    {
        filename: 'api-reference.txt',
        content: `API Reference Documentation

Base URL: https://api.example.com/v1

Authentication:
All API requests require a valid API key in the header:
X-API-Key: your_api_key_here

Available Endpoints:

1. User Management
   GET /users - List all users
   POST /users - Create new user
   GET /users/{id} - Get user details
   PUT /users/{id} - Update user
   DELETE /users/{id} - Delete user

2. Product Management
   GET /products - List all products
   POST /products - Create new product
   GET /products/{id} - Get product details

Error Codes:
400 - Bad Request
401 - Unauthorized
404 - Not Found
500 - Internal Server Error`
    },
    {
        filename: 'getting-started.txt',
        content: `Getting Started Guide

Welcome to our platform! This guide will help you get up and running quickly.

System Requirements:
- Windows 10/11 or macOS 10.15+
- 8GB RAM minimum (16GB recommended)
- 4 CPU cores
- 20GB free disk space

Installation Steps:
1. Download the installer from your account dashboard
2. Run the installer package
3. Follow the setup wizard
4. Enter your license key
5. Complete initial configuration

First Steps:
1. Create your first project
2. Set up team members
3. Configure integration settings
4. Run the test suite`
    },
    {
        filename: 'troubleshooting-guide.txt',
        content: `Troubleshooting Guide

Common Issues and Solutions:

1. Connection Problems
   Symptom: Unable to connect to server
   Solutions:
   - Check network connectivity
   - Verify firewall settings
   - Ensure VPN is connected (if required)
   - Validate API credentials

2. Performance Issues
   Symptom: Slow response times
   Solutions:
   - Check system resources
   - Clear application cache
   - Update to latest version
   - Optimize database queries

3. Authentication Errors
   Symptom: Unable to log in
   Solutions:
   - Reset password
   - Clear browser cookies
   - Check account status
   - Verify email verification status`
    },
    {
        filename: 'release-notes-v2.txt',
        content: `Release Notes - Version 2.0

Release Date: October 29, 2024

New Features:
1. Enhanced Search Capabilities
   - Full-text search support
   - Advanced filtering options
   - Real-time search suggestions

2. Improved User Interface
   - New dashboard design
   - Dark mode support
   - Customizable widgets

3. Performance Improvements
   - 50% faster load times
   - Reduced memory usage
   - Optimized database queries

Bug Fixes:
- Fixed user authentication issues
- Resolved data sync problems
- Fixed export functionality
- Corrected timezone handling

Known Issues:
- Minor display glitch in reports
- Occasional delay in real-time updates`
    },
    {
        filename: 'security-guidelines.txt',
        content: `Security Guidelines and Best Practices

1. Password Requirements
   - Minimum 12 characters
   - Mix of uppercase and lowercase
   - Include numbers and symbols
   - No common dictionary words

2. Access Control
   - Use role-based access control
   - Regular permission audits
   - Enable two-factor authentication
   - Session timeout controls

3. Data Protection
   - End-to-end encryption
   - Regular data backups
   - Secure file transfer
   - Data retention policies

4. Network Security
   - Use SSL/TLS encryption
   - Regular security updates
   - Firewall configuration
   - VPN access for remote work`
    }
];

async function createTestDocuments() {
    const docsPath = path.join(__dirname, '../documents');
    
    // Create documents directory if it doesn't exist
    if (!fs.existsSync(docsPath)) {
        fs.mkdirSync(docsPath, { recursive: true });
        console.log('Created documents directory:', docsPath);
    }

    // Create each test document
    for (const doc of sampleDocs) {
        const filePath = path.join(docsPath, doc.filename);
        fs.writeFileSync(filePath, doc.content, 'utf8');
        console.log(`Created: ${doc.filename}`);
    }

    console.log('\nTest documents created successfully!');
    console.log(`Location: ${docsPath}`);
    console.log('\nTotal documents created:', sampleDocs.length);
    console.log('\nYou can now run the upload script:');
    console.log('npm run upload:docs');
}

// Run the script
if (require.main === module) {
    createTestDocuments().catch(console.error);
}

export { createTestDocuments };