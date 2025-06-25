#!/bin/bash

# Keep-Alive Service for Render Apps
# Prevents cold starts by pinging every 14 minutes

# Colors
GREEN='\033[1;32m'
BLUE='\033[1;34m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Render Keep-Alive Service${NC}"
echo -e "${YELLOW}Prevents your app from going to sleep on Render${NC}"
echo ""

# Check if APP_URL is provided
if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ APP_URL environment variable is required${NC}"
    echo ""
    echo "Usage examples:"
    echo "  APP_URL=https://your-app.onrender.com ./keep-alive.sh"
    echo "  export APP_URL=https://your-app.onrender.com && ./keep-alive.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}📡 Target URL: $APP_URL${NC}"
echo -e "${GREEN}⏰ Ping interval: 14 minutes${NC}"
echo -e "${GREEN}🎯 Endpoint: /api/tasks${NC}"
echo ""
echo -e "${YELLOW}💡 This will keep your Render app warm and prevent cold starts${NC}"
echo -e "${YELLOW}🛑 Press Ctrl+C to stop${NC}"
echo "─────────────────────────────────────────────────────"

# Function to ping the app
ping_app() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local start_time=$(date +%s%3N)
    
    # Use HEAD request to check if app is alive (avoids auth issues)
    local response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" \
                          --max-time 10 \
                          --connect-timeout 5 \
                          -H "User-Agent: Keep-Alive-Service/1.0" \
                          --head "$APP_URL/api/tasks" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        local status_code=$(echo $response | cut -d',' -f1)
        local response_time=$(echo $response | cut -d',' -f2)
        local response_time_ms=$(echo "$response_time * 1000 / 1" | bc 2>/dev/null || echo "???")
        
        # Status 200 (OK) or 401 (auth required) both mean app is alive
        if [ "$status_code" = "200" ] || [ "$status_code" = "401" ]; then
            echo -e "✅ [$timestamp] App is alive! (HTTP $status_code) - ${response_time_ms}ms"
        else
            echo -e "⚠️  [$timestamp] Unexpected status: HTTP $status_code - ${response_time_ms}ms"
        fi
    else
        echo -e "❌ [$timestamp] Failed to reach app (timeout or connection error)"
    fi
}

# Install bc if not available (for response time calculation)
if ! command -v bc &> /dev/null; then
    echo -e "${YELLOW}📦 Installing bc for response time calculation...${NC}"
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y bc
    elif command -v yum &> /dev/null; then
        sudo yum install -y bc
    elif command -v brew &> /dev/null; then
        brew install bc
    fi
fi

# Initial ping
echo -e "${BLUE}🔥 Starting keep-alive service...${NC}"
ping_app

# Main loop - ping every 14 minutes (840 seconds)
while true; do
    sleep 840  # 14 minutes
    ping_app
done