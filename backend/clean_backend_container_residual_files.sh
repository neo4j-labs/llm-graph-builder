#!/bin/bash

# Function to run cleanup commands
cleanup() {

    if [ -d "./backend/.env" ]; then
        rm -f ./backend/.env
    fi
    find . -type d -name "__pycache__" -exec  rm -rf {} +
    find . -type f -name "*.log" -exec  rm -rf {} +

}

# Run the cleanup function
echo "Running cleanup using bash..."
cleanup
echo "Cleanup complete."