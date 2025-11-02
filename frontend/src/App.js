// frontend/src/App.js - FIXED VERSION with Processing Indicator
import React, { useState } from 'react';
import './App.css';
import ComplianceSelector from './components/ComplianceSelector';
import RequirementsEditor from './components/RequirementsEditor';
import TestResults from './components/TestResults';
import ProcessingIndicator from './components/ProcessingIndicator';

function App() {
  // State Management
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [methodology, setMethodology] = useState('agile');
  const [selectedCompliances, setSelectedCompliances] = useState(['hipaa']);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [error, setError] = useState(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [showRequirementsEditor, setShowRequirementsEditor] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Derived state for easier access
  const testCases = results?.testCases || [];
  const requirements = results?.extractedData?.requirements || [];
  const metadata = results?.metadata || {};

  // File Upload Handler
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    setFileName(uploadedFile.name);
    await processDocument(uploadedFile);
  };

  // Process Document
  const processDocument = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setResults(null);
    setIsProcessed(false);
    setShowRequirementsEditor(false);
    setProcessingStage('Uploading document...');
    
    try {
      const formData = new FormData();
      formData.append('document', uploadedFile);
      formData.append('methodology', methodology);
      
      selectedCompliances.forEach(compliance => {
        formData.append('complianceFrameworks[]', compliance);
      });
      
      console.log('Processing with:', { methodology, compliances: selectedCompliances });
      
      setProcessingStage('Document AI Processing...');
      
      const response = await fetch(
        'https://medtestai-backend-1067292712875.us-central1.run.app/api/workflow/complete',
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      setProcessingStage('Generating test cases...');
      const data = await response.json();
      console.log('Received response:', data);
      console.log('Test cases count:', data.testCases?.length || 0);
      
      setResults(data);
      setIsProcessed(true);
    } catch (error) {
      console.error('Error:', error);
      setError(`Error processing document: ${error.message}`);
    } finally {
      setLoading(false);
      setProcessingStage('');
    }
  };

  // Regenerate Tests Handler with Processing Indicator
  const handleRegenerateTests = async (data) => {
    setRegenerating(true);
    setProcessingStage('Regenerating test cases...');
    
    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResults(prev => ({
        ...prev,
        testCases: data.testCases || prev.testCases,
        metadata: {
          ...prev.metadata,
          ...data.metadata
        },
        summary: data.summary || prev.summary
      }));
      setShowRequirementsEditor(false);
    } catch (error) {
      console.error('Regeneration error:', error);
      setError(`Error regenerating tests: ${error.message}`);
    } finally {
      setRegenerating(false);
      setProcessingStage('');
    }
  };

  // Reset Handler
  const handleReset = () => {
    setFile(null);
    setFileName('');
    setResults(null);
    setError(null);
    setIsProcessed(false);
    setShowRequirementsEditor(false);
  };

  // Reprocess Handler
  const handleReprocess = async () => {
    if (file) {
      await processDocument(file);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>MedTestAI</h1>
        <p>Healthcare Test Automation with AI</p>
      </header>

      <main className="app-main">
        {!isProcessed ? (
          <div className="upload-container">
            {/* Methodology Selector */}
            <div className="methodology-section">
              <h3>Testing Methodology</h3>
              <select 
                value={methodology} 
                onChange={(e) => setMethodology(e.target.value)}
                disabled={loading}
                className="methodology-select"
              >
                <option value="agile">Agile</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Compliance Selector */}
            <ComplianceSelector
              selectedCompliances={selectedCompliances}
              onChange={setSelectedCompliances}
            />

            {/* File Upload */}
            <div className="upload-section">
              <h3>Upload Healthcare Requirements Document</h3>
              
              {fileName && (
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontWeight: '600',
                  fontSize: '16px',
                  textAlign: 'center',
                  wordBreak: 'break-word'
                }}>
                  {fileName}
                </div>
              )}
              
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={loading}
                className="file-input"
              />
              
              {loading && (
                <ProcessingIndicator 
                  stage={processingStage}
                  methodology={methodology}
                  complianceFramework={selectedCompliances.join(', ')}
                />
              )}

              {error && (
                <div className="error-message">
                  <h3>Error</h3>
                  <p>{error}</p>
                  <button onClick={handleReset} className="reset-button">
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="results-container">
            {/* Processing Indicator for Regeneration */}
            {regenerating && (
              <ProcessingIndicator 
                stage={processingStage}
                methodology={methodology}
                complianceFramework={selectedCompliances.join(', ')}
              />
            )}

            {!regenerating && (
              <>
                {/* Success Banner */}
                <div className="success-banner">
                  <h2>Processing Complete!</h2>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-number">{requirements.length}</span>
                      <span className="stat-label">Requirements Found</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{testCases.length}</span>
                      <span className="stat-label">Test Cases Generated</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{selectedCompliances.length}</span>
                      <span className="stat-label">Compliance Frameworks</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  <button 
                    onClick={() => setShowRequirementsEditor(!showRequirementsEditor)}
                    className="edit-button"
                  >
                    {showRequirementsEditor ? 'Hide Editor' : 'Edit Requirements & Regenerate'}
                  </button>
                  <button onClick={handleReprocess} className="reprocess-button">
                    Reprocess with New Settings
                  </button>
                  <button onClick={handleReset} className="reset-button">
                    Upload New Document
                  </button>
                </div>

                {/* Requirements Editor */}
                {showRequirementsEditor && (
                  <div className="requirements-editor-container">
                    <RequirementsEditor
                      initialRequirements={requirements}
                      methodology={methodology}
                      complianceFrameworks={selectedCompliances}
                      onRegenerate={handleRegenerateTests}
                    />
                  </div>
                )}

                {/* Test Results Display */}
                {testCases.length > 0 && (
                  <div className="test-results-container">
                    <TestResults 
                      results={results}
                      methodology={methodology}
                      complianceFramework={selectedCompliances.join(', ')}
                      onNewAnalysis={handleReset}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2025 MedTestAI - HIPAA-Compliant Healthcare Test Automation</p>
      </footer>
    </div>
  );
}

export default App;