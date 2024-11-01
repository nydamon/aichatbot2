#!/bin/bash

# Base directory
BASE_DIR="./src"

# Create directories if they don't exist
declare -a directories=(
    "interfaces"
    "services"
    "types"
    "handlers"
    "utils"
    "config"
)

for dir in "${directories[@]}"; do
    if [ ! -d "$BASE_DIR/$dir" ]; then
        echo "Creating directory: $BASE_DIR/$dir"
        mkdir -p "$BASE_DIR/$dir"
    else
        echo "Directory already exists: $BASE_DIR/$dir"
    fi
done

# Function to create file if it doesn't exist
create_file() {
    if [ ! -f "$1" ]; then
        echo "Creating file: $1"
        touch "$1"
    else
        echo "File already exists: $1"
    fi
}

# Create interface files
create_file "$BASE_DIR/interfaces/IMessageHandler.ts"
create_file "$BASE_DIR/interfaces/IFileHandler.ts"
create_file "$BASE_DIR/interfaces/IConversationManager.ts"
create_file "$BASE_DIR/interfaces/IServiceClients.ts"

# Create service files
create_file "$BASE_DIR/services/OpenAIService.ts"
create_file "$BASE_DIR/services/SearchService.ts"
create_file "$BASE_DIR/services/StorageService.ts"
create_file "$BASE_DIR/services/ConversationService.ts"

# Create type files
create_file "$BASE_DIR/types/ChatTypes.ts"
create_file "$BASE_DIR/types/FileTypes.ts"
create_file "$BASE_DIR/types/ConfigTypes.ts"
create_file "$BASE_DIR/types/SearchTypes.ts"

# Create handler files
create_file "$BASE_DIR/handlers/MessageHandler.ts"
create_file "$BASE_DIR/handlers/FileHandler.ts"
create_file "$BASE_DIR/handlers/CommandHandler.ts"

# Create utils file
create_file "$BASE_DIR/utils/helpers.ts"

echo "Directory structure and files created successfully!"
