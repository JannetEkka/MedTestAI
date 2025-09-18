import React, { useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import MethodologySelector from './components/MethodologySelector';
import TestResults from './components/TestResults';
import './App.css';

function App() {
  const [methodology, setMethodology] = useState('agile');
  const [results, setResults] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleDocumentProcess = async (file) => {
    setProcessing(true);
    
    // Simulate processing delay for demo
    setTimeout(async () => {
      try {
        // Process document
        const processResponse = await fetch('http://localhost:3000/api/documents/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name })
        });
        
        // Generate tests based on methodology
        const testResponse = await fetch('http://localhost:3000/api/tests/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ methodology })
        });
        
        const testResults = await testResponse.json();
        setResults(testResults);
        setProcessing(false);
      } catch (error) {
        console.error('Processing failed:', error);
        setProcessing(false);
      }
    }, 2000); // 2 second demo delay
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🏥 MedTestAI</h1>
        <p>Healthcare AI Testing Platform</p>
      </header>
      
      <main className="app-main">
        <MethodologySelector 
          selected={methodology} 
          onSelect={setMethodology} 
        />
        
        <DocumentUpload 
          onUpload={handleDocumentProcess}
          processing={processing}
        />
        
        {results && (
          <TestResults 
            results={results} 
            methodology={methodology}
          />
        )}
      </main>
    </div>
  );
}

export default App;