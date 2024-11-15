#!/bin/bash

# Function to safely remove files and directories
safe_remove() {
    if [ -e "$1" ]; then
        echo "Removing: $1"
        rm -rf "$1"
    else
        echo "Not found: $1"
    fi
}

echo "Starting cleanup process..."

# Remove unnecessary test files
echo "Removing unnecessary test files..."
safe_remove "src/search-credential-test.ts"
safe_remove "src/search-index-inspector.ts"
safe_remove "src/test-azure-services.ts"
safe_remove "src/minimal-test.ts"
safe_remove "src/search-bulk-upload.ts"

# Remove build artifacts
echo "Removing build artifacts..."
safe_remove "dist"
safe_remove "coverage"

# Remove unused configuration
echo "Removing unused configuration..."
safe_remove "teamsapp.testtool.yml"
safe_remove "teamsapp.local.yml"
safe_remove "setup-structure.sh"

# Remove sample and temporary documents
echo "Removing sample and temporary documents..."
safe_remove "documents"
safe_remove "downloads"
safe_remove "processed_documents"

# Remove any leftover TypeScript compilation artifacts
echo "Removing TypeScript artifacts..."
find . -name "*.js.map" -type f -delete
find . -name "*.d.ts" -type f -not -path "./node_modules/*" -delete

echo "Cleanup complete!"
echo "Note: Remember to run 'git add .' and commit changes if using version control."
