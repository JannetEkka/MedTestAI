#!/bin/bash

# Fix MedTestAI Nested Directory Structure
# This script moves all files from the nested directory to the correct location

echo "🔧 Fixing MedTestAI directory structure..."

# Check if we're in the right directory
if [ ! -d "MedTestAI" ]; then
    echo "❌ Error: MedTestAI subdirectory not found. Make sure you're in the main project folder."
    exit 1
fi

# Navigate to the main project directory
cd "D:/Projects/Gen AI Exchange Hackathon/MedTestAI"

echo "📁 Current directory: $(pwd)"
echo "📂 Found nested structure. Moving files up one level..."

# Stop any running processes
pkill -f nodemon 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true

# Move all files from nested MedTestAI to current directory
echo "📦 Moving files from MedTestAI/ to current directory..."

# Move package.json and other config files
if [ -f "MedTestAI/package.json" ]; then
    cp MedTestAI/package.json . 2>/dev/null || true
    echo "  ✅ Moved package.json"
fi

if [ -f "MedTestAI/.env" ]; then
    cp MedTestAI/.env . 2>/dev/null || true
    echo "  ✅ Moved .env"
fi

if [ -f "MedTestAI/medtestai-sa-key.json" ]; then
    cp MedTestAI/medtestai-sa-key.json . 2>/dev/null || true
    echo "  ✅ Moved service account key"
fi

if [ -f "MedTestAI/start-dev.sh" ]; then
    cp MedTestAI/start-dev.sh . 2>/dev/null || true
    chmod +x start-dev.sh
    echo "  ✅ Moved start script"
fi

# Move server.js if it exists
if [ -f "MedTestAI/server.js" ]; then
    cp MedTestAI/server.js . 2>/dev/null || true
    echo "  ✅ Moved server.js"
fi

# Move frontend directory
if [ -d "MedTestAI/frontend" ] && [ ! -d "frontend" ]; then
    cp -r MedTestAI/frontend . 2>/dev/null || true
    echo "  ✅ Moved frontend directory"
elif [ -d "MedTestAI/frontend" ] && [ -d "frontend" ]; then
    # Merge frontend directories
    cp -r MedTestAI/frontend/* frontend/ 2>/dev/null || true
    echo "  ✅ Merged frontend directory"
fi

# Move infrastructure directory
if [ -d "MedTestAI/infrastructure" ] && [ ! -d "infrastructure" ]; then
    cp -r MedTestAI/infrastructure . 2>/dev/null || true
    echo "  ✅ Moved infrastructure directory"
elif [ -d "MedTestAI/infrastructure" ] && [ -d "infrastructure" ]; then
    # Merge infrastructure directories
    cp -r MedTestAI/infrastructure/* infrastructure/ 2>/dev/null || true
    echo "  ✅ Merged infrastructure directory"
fi

# Move test-documents directory
if [ -d "MedTestAI/test-documents" ] && [ ! -d "test-documents" ]; then
    cp -r MedTestAI/test-documents . 2>/dev/null || true
    echo "  ✅ Moved test-documents directory"
elif [ -d "MedTestAI/test-documents" ] && [ -d "test-documents" ]; then
    # Merge test-documents directories
    cp -r MedTestAI/test-documents/* test-documents/ 2>/dev/null || true
    echo "  ✅ Merged test-documents directory"
fi

# Move node_modules if needed (usually better to reinstall)
if [ -d "MedTestAI/node_modules" ] && [ ! -d "node_modules" ]; then
    echo "  ⚠️  Found node_modules in nested directory - will reinstall instead"
fi

echo ""
echo "🧹 Cleaning up nested directory..."
rm -rf MedTestAI/ 2>/dev/null || true

echo "📋 Current directory structure:"
ls -la

echo ""
echo "🔧 Installing dependencies in correct location..."
npm install --silent

echo ""
echo "✅ Directory structure fixed!"
echo ""
echo "🚀 Ready to start the application:"
echo "   ./start-dev.sh"
echo ""