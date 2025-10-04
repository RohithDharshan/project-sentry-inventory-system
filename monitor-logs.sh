#!/bin/bash

# Project Sentry - Real-time Log Monitor
# This script provides a colorized, real-time view of API requests and MongoDB operations

echo "🔍 Project Sentry - Real-time Monitoring Dashboard"
echo "=================================================="
echo "Monitoring requests, MongoDB operations, and system logs..."
echo "Press Ctrl+C to stop monitoring"
echo ""

# Colors for different log types
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Function to colorize log lines
colorize_log() {
    while IFS= read -r line; do
        if [[ $line == *"INCOMING REQUEST"* ]]; then
            echo -e "${BLUE}$line${NC}"
        elif [[ $line == *"REQUEST COMPLETED"* ]]; then
            if [[ $line == *"🔴"* ]]; then
                echo -e "${RED}$line${NC}"
            else
                echo -e "${GREEN}$line${NC}"
            fi
        elif [[ $line == *"MONGODB OPERATION"* ]]; then
            echo -e "${PURPLE}$line${NC}"
        elif [[ $line == *"MongoDB Connected"* ]] || [[ $line == *"MongoDB reconnected"* ]]; then
            echo -e "${GREEN}$line${NC}"
        elif [[ $line == *"MongoDB disconnected"* ]] || [[ $line == *"MongoDB connection error"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"Demo mode"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        elif [[ $line == *"error"* ]] || [[ $line == *"Error"* ]]; then
            echo -e "${RED}$line${NC}"
        elif [[ $line == *"warn"* ]]; then
            echo -e "${YELLOW}$line${NC}"
        else
            echo -e "${WHITE}$line${NC}"
        fi
    done
}

# Monitor both server output and log files
if [ -f "server.log" ]; then
    echo "📋 Monitoring server.log and combined.log..."
    tail -f server.log logs/combined.log 2>/dev/null | colorize_log
else
    echo "📋 Monitoring logs/combined.log..."
    tail -f logs/combined.log 2>/dev/null | colorize_log
fi