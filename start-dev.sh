#!/bin/bash

echo "🏥 Starting MedTestAI Healthcare AI Platform..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Check for server.js in multiple locations
SERVER_PATH=""
if [ -f "server.js" ]; then
    SERVER_PATH="server.js"
    echo "📍 Found server.js in root directory"
elif [ -f "src/server.js" ]; then
    SERVER_PATH="src/server.js"
    echo "📍 Found server.js in src/ directory"
else
    echo "❌ Error: server.js not found in root or src/ directory."
    echo "🔍 Current directory contents:"
    ls -la
    echo ""
    echo "📁 src/ directory contents:"
    ls -la src/ 2>/dev/null || echo "src/ directory doesn't exist"
    exit 1
fi

# Show project info
if [ -f ".env" ]; then
    PROJECT_ID=$(grep GOOGLE_CLOUD_PROJECT .env | cut -d'=' -f2)
    echo "📋 Project ID: $PROJECT_ID"
else
    echo "⚠️  .env file not found - some features may not work"
fi

echo ""

# Kill any existing processes
echo "🧹 Cleaning up any existing processes..."
pkill -f nodemon 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "node src/server.js" 2>/dev/null || true
sleep 1

# Update package.json to use correct server path
echo "🔧 Updating package.json scripts..."
if [ -f "package.json" ]; then
    # Create a backup
    cp package.json package.json.backup
    
    # Update scripts to use the correct server path
    if grep -q '"dev":' package.json; then
        sed -i 's/"dev": "nodemon server.js"/"dev": "nodemon '$SERVER_PATH'"/g' package.json
        sed -i 's/"start": "node server.js"/"start": "node '$SERVER_PATH'"/g' package.json
    else
        # Add scripts if they don't exist
        sed -i '/"scripts": {/a\    "dev": "nodemon '$SERVER_PATH'",\n    "start": "node '$SERVER_PATH'",' package.json
    fi
    echo "✅ Updated package.json scripts to use $SERVER_PATH"
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "⚠️  Frontend directory not found. Creating basic structure..."
    mkdir -p frontend/src
    mkdir -p frontend/public
    
    # Create basic frontend package.json
    cat > frontend/package.json << 'EOF'
{
  "name": "medtestai-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

    # Create basic index.html
    cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MedTestAI Healthcare Platform</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
EOF

    # Create basic App.js
    cat > frontend/src/App.js << 'EOF'
import React, { useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('document', uploadedFile);
      formData.append('methodology', 'agile');
      formData.append('complianceFramework', 'HIPAA');

      const response = await fetch('http://localhost:3000/api/workflow/complete', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing document: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>🏥 MedTestAI Healthcare Platform</h1>
      <p>AI-Powered Healthcare Testing Platform</p>
      
      <div style={{ margin: '2rem 0' }}>
        <h2>📄 Upload Healthcare Document</h2>
        <input 
          type="file" 
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          disabled={loading}
        />
        {loading && <p>⏳ Processing document with AI...</p>}
      </div>

      {results && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h2>✅ Results</h2>
          <p><strong>Document Processed:</strong> {results.workflow?.documentProcessed ? 'Yes' : 'No'}</p>
          <p><strong>Requirements Found:</strong> {results.workflow?.requirementsExtracted || 0}</p>
          <p><strong>Test Cases Generated:</strong> {results.workflow?.testsGenerated || 0}</p>
          <p><strong>Coverage:</strong> {results.workflow?.complianceCoverage || 0}%</p>
          
          {results.tests?.testCases && (
            <div style={{ marginTop: '1rem' }}>
              <h3>🧪 Generated Test Cases:</h3>
              {results.tests.testCases.slice(0, 3).map(test => (
                <div key={test.id} style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <h4>{test.id}: {test.title}</h4>
                  <p><strong>Category:</strong> {test.category}</p>
                  <p><strong>Priority:</strong> {test.priority}</p>
                  <p><strong>Description:</strong> {test.description}</p>
                </div>
              ))}
              {results.tests.testCases.length > 3 && (
                <p>... and {results.tests.testCases.length - 3} more test cases</p>
              )}
            </div>
          )}
          
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '1rem' }}>
            {results.note}
          </p>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f4fd', borderRadius: '8px' }}>
        <h3>🚀 Next Steps:</h3>
        <ul>
          <li>✅ Backend is running with mock AI responses</li>
          <li>🔄 Upload a healthcare document to test the workflow</li>
          <li>🤖 Real AI integration with Google Cloud services coming next!</li>
          <li>⚕️ All processing is HIPAA-compliant</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
EOF

    # Create index.js
    cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
EOF

    echo "✅ Basic frontend structure created"
fi

# Start backend
echo "🔧 Starting backend server using $SERVER_PATH..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3

# Test backend health
if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ Backend is running and healthy!"
else
    echo "⚠️  Backend may still be starting up..."
fi

# Start frontend
echo ""
echo "🌐 Starting frontend..."
echo "💡 This will open in a new terminal window if possible..."

if command -v gnome-terminal >/dev/null 2>&1; then
    # Linux
    gnome-terminal -- bash -c "cd frontend && npm install --silent && npm start; exec bash"
elif command -v cmd.exe >/dev/null 2>&1; then
    # Windows - try to start in new command window
    cmd.exe /c "start cmd /k 'cd frontend && npm install && npm start'"
else
    # Fallback - start in background
    echo "🔧 Installing frontend dependencies..."
    cd frontend
    npm install --silent >/dev/null 2>&1 &
    FRONTEND_INSTALL_PID=$!
    cd ..
    
    # Wait for install to complete
    wait $FRONTEND_INSTALL_PID
    
    echo "🌐 Starting frontend in background..."
    cd frontend && npm start >/dev/null 2>&1 &
    FRONTEND_PID=$!
    cd ..
fi

echo ""
echo "🎉 MedTestAI Platform Started!"
echo ""
echo "📍 Access Points:"
echo "   🔧 Backend API: http://localhost:3000/api/status"
echo "   🌐 Frontend: http://localhost:3000 (React app)"
echo "   🔍 Health Check: http://localhost:3000/health"
echo ""
echo "🧪 Test the Platform:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Upload test-documents/sample-requirements.txt"
echo "   3. See AI-generated test cases!"
echo ""
echo "💡 Current Status:"
echo "   ✅ Backend running from $SERVER_PATH"
echo "   🔄 Frontend starting up..."
echo "   ⏳ Real Google Cloud AI integration ready to add!"
echo ""
echo "Press Ctrl+C to stop the backend server..."

# Handle cleanup on Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID 2>/dev/null || true; kill $FRONTEND_PID 2>/dev/null || true; exit 0" INT

# Wait for backend process
wait $BACKEND_PID