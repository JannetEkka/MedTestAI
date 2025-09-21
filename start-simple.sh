#!/bin/bash

echo "🏥 MedTestAI Healthcare Platform - Simple Start"
echo "=============================================="

# Kill existing processes
echo "🧹 Stopping any existing processes..."
pkill -f nodemon 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true
sleep 1

# Check files exist
if [ ! -f "src/server.js" ]; then
    echo "❌ src/server.js not found!"
    echo "📁 Current directory:"
    ls -la
    echo "📁 src/ directory:"
    ls -la src/
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found!"
    exit 1
fi

# Show status
echo "✅ Found src/server.js"
echo "📋 Project: $(grep GOOGLE_CLOUD_PROJECT .env 2>/dev/null | cut -d'=' -f2 || echo 'Not configured')"

# Start backend directly
echo ""
echo "🔧 Starting backend server..."
echo "   Using: node src/server.js"
echo "   Port: 3000"
echo ""

# Start server directly (bypass npm scripts for now)
node src/server.js &
SERVER_PID=$!

# Wait and test
sleep 2
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ Backend started successfully!"
    echo "🌐 Backend running at: http://localhost:3000"
    echo "🔍 Health check: http://localhost:3000/health"
    echo "📊 API status: http://localhost:3000/api/status"
else
    echo "⚠️  Backend starting up..."
fi

echo ""
echo "🎯 Quick Test:"
echo "   curl http://localhost:3000/health"
echo ""
echo "🚀 Next Steps:"
echo "   1. Test backend: open http://localhost:3000/health"
echo "   2. Open new terminal: cd frontend && npm install && npm start"  
echo "   3. Open browser: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for server
wait $SERVER_PID