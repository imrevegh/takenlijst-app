#!/bin/bash
# Takenlijst App Startup Script - Optimized with PM2

# Colors for cool effects
BLUE='\033[1;34m'
GREEN='\033[1;32m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m' # No Color

# Cool ASCII art logo with colors
echo ""
echo -e "${BLUE}  ████████╗ █████╗ ██╗  ██╗███████╗███╗   ██╗██╗     ██╗ ██╗███████╗████████╗${NC}"
echo -e "${BLUE}  ╚══██╔══╝██╔══██╗██║ ██╔╝██╔════╝████╗  ██║██║     ██║ ██║██╔════╝╚══██╔══╝${NC}"
echo -e "${CYAN}     ██║   ███████║█████╔╝ █████╗  ██╔██╗ ██║██║     ██║ ██║███████╗   ██║   ${NC}"
echo -e "${CYAN}     ██║   ██╔══██║██╔═██╗ ██╔══╝  ██║╚██╗██║██║     ██║ ██║╚════██║   ██║   ${NC}"
echo -e "${PURPLE}     ██║   ██║  ██║██║  ██╗███████╗██║ ╚████║███████╗██║ ██║███████║   ██║   ${NC}"
echo -e "${PURPLE}     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═╝╚══════╝   ╚═╝   ${NC}"
echo ""
echo -e "                      ${YELLOW}📋 Local Task Manager with Link Previews 🔗${NC}"
echo -e "                           ${GREEN}⚡ Powered by Node.js & PM2 ⚡${NC}"
echo ""
echo "🚀 Starting Takenlijst App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "You can install it with: sudo apt install nodejs npm"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    echo "You can install it with: sudo apt install npm"
    exit 1
fi

# Navigate to the app directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check for PM2 (skip installation for faster startup)
if command -v pm2 &> /dev/null; then
    USE_PM2=true
    echo "⚡ PM2 detected - will use optimized startup"
else
    USE_PM2=false
    echo "🐌 PM2 not installed - using standard startup (install with: npm install -g pm2)"
fi

# Create data directory if it doesn't exist
mkdir -p data

echo "✅ Dependencies ready"

# Function to open browser
open_browser() {
    echo "🌐 Opening browser..."
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000 2>/dev/null &
    elif command -v gnome-open &> /dev/null; then
        gnome-open http://localhost:3000 2>/dev/null &
    elif command -v firefox &> /dev/null; then
        firefox http://localhost:3000 2>/dev/null &
    else
        echo "🌐 Please open your browser and go to: http://localhost:3000"
    fi
}

# Check if already running and open browser immediately
if [ "$USE_PM2" = true ] && pm2 list 2>/dev/null | grep -q "takenlijst.*online"; then
    echo "⚡ Takenlijst app is already running!"
    open_browser
    exit 0
fi

# Start server in background
echo "🚀 Starting server on http://localhost:3000"
echo "📋 Your tasks will be saved locally in the 'data' folder"

if [ "$USE_PM2" = true ]; then
    echo "⚡ Using PM2 for optimized performance..."
    pm2 delete takenlijst 2>/dev/null >/dev/null
    # Use ecosystem config for better performance
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js >/dev/null 2>&1 &
    else
        pm2 start npm --name "takenlijst" -- start >/dev/null 2>&1 &
    fi
    SERVER_START_PID=$!
else
    echo "🐌 Using standard startup..."
    npm start >/dev/null 2>&1 &
    SERVER_START_PID=$!
fi

# Wait for server to be ready before opening browser
echo "⏳ Waiting for server to be ready..."

# Health check loop with timeout
MAX_ATTEMPTS=30
ATTEMPT=0
SERVER_READY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        SERVER_READY=true
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    sleep 1
    
    # Show progress every 5 seconds
    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        echo "⏳ Still waiting for server... (${ATTEMPT}s)"
    fi
done

if [ "$SERVER_READY" = true ]; then
    echo "✅ Server is ready and responding!"
    echo "🌐 Opening browser..."
    open_browser
else
    echo "❌ Server failed to start within 30 seconds"
    echo "🔍 Check logs with: pm2 logs takenlijst (if using PM2) or try manual start: npm start"
    exit 1
fi

echo ""
echo "💡 Useful commands:"
if [ "$USE_PM2" = true ]; then
    echo "   pm2 list - See app status"
    echo "   pm2 stop takenlijst - Stop the app"
    echo "   pm2 logs takenlijst - View logs"
    echo "   pm2 restart takenlijst - Restart app"
else
    echo "   Use Ctrl+C in this terminal to stop the server"
    echo "   Or install PM2 for background operation: npm install -g pm2"
fi

echo ""
echo -e "${GREEN}🎉 Takenlijst should now be opening in your browser!${NC}"
echo -e "${CYAN}📋 Bookmark: ${YELLOW}http://localhost:3000${NC}"
echo -e "${PURPLE}✨ Happy task managing! ✨${NC}"
echo ""