import React, { useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [file, setFile] = useState(null);
  const [methodology, setMethodology] = useState('agile');
  const [complianceFramework, setComplianceFramework] = useState('HIPAA');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessed, setIsProcessed] = useState(false);

  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    
    await processDocument(uploadedFile);
  };

  const processDocument = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setResults(null);
    setIsProcessed(false);
    
    try {
      const formData = new FormData();
      formData.append('document', uploadedFile);
      formData.append('methodology', methodology);
      formData.append('complianceFramework', complianceFramework);

      console.log('🚀 Sending request to:', `${API_BASE_URL}/workflow/complete`);

      const response = await fetch(`${API_BASE_URL}/workflow/complete`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Received response:', data);
      
      // Log the structure to help debug
      console.log('📊 Requirements found:', data.extractedData?.requirements?.length || 0);
      console.log('🧪 Test cases generated:', data.testCases?.testCases?.length || 0);
      console.log('📈 Coverage:', data.testCases?.summary?.coverage || 0);
      
      setResults(data);
      setIsProcessed(true);
    } catch (error) {
      console.error('❌ Error:', error);
      setError(`Error processing document: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    if (!file) {
      alert('No file to reprocess. Please upload a document first.');
      return;
    }
    
    await processDocument(file);
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setError(null);
    setIsProcessed(false);
    setMethodology('agile');
    setComplianceFramework('HIPAA');
    
    // Reset file input
    const fileInput = document.querySelector('.file-input');
    if (fileInput) fileInput.value = '';
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      const data = await response.json();
      alert(`✅ Backend Connected!\nStatus: ${data.status}\nProject: ${data.project}\nServices: ${data.services?.join(', ') || 'Healthcare AI'}`);
    } catch (error) {
      alert(`❌ Backend Connection Failed:\n${error.message}`);
    }
  };

  const handleExport = async (format) => {
    if (!results?.testCases?.testCases?.length) {
      alert('No test cases available for export');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tests/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testCases: results.testCases.testCases,
          format: format,
          methodology: methodology,
          compliance: complianceFramework
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Create and trigger download
        const blob = new Blob([result.data], { 
          type: result.mimeType || 'text/plain'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `medtestai-export-${format}-${Date.now()}.txt`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert(`✅ Successfully exported ${result.exportedCount || results.testCases.testCases.length} test cases as ${format.toUpperCase()}`);
      }
    } catch (error) {
      alert(`❌ Export failed: ${error.message}`);
    }
  };

  // Extract data from the correct response structure
  const requirementsCount = results?.extractedData?.requirements?.length || 0;
  const testCasesCount = results?.testCases?.testCases?.length || 0;
  const coveragePercent = results?.testCases?.summary?.coverage || 0;
  const requirements = results?.extractedData?.requirements || [];
  const testCases = results?.testCases?.testCases || [];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🏥 MedTestAI Healthcare Platform</h1>
          <p>AI-Powered Healthcare Testing & Compliance Platform</p>
          <div className="compliance-badge">
            <span className="badge hipaa">HIPAA Compliant</span>
            <span className="badge ai">AI-Powered</span>
            <span className="badge secure">Secure</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="config-section">
          <div className="config-grid">
            <div className="config-card">
              <h3>🔧 Testing Methodology</h3>
              <select 
                value={methodology} 
                onChange={(e) => setMethodology(e.target.value)}
                className="config-select"
                disabled={loading}
              >
                <option value="agile">Agile/Scrum</option>
                <option value="waterfall">Waterfall</option>
                <option value="hybrid">Hybrid</option>
              </select>
              {isProcessed && (
                <small style={{ color: '#7f8c8d', display: 'block', marginTop: '5px' }}>
                  Change and click "Reprocess" to regenerate with new methodology
                </small>
              )}
            </div>
            
            <div className="config-card">
              <h3>📋 Compliance Framework</h3>
              <select 
                value={complianceFramework} 
                onChange={(e) => setComplianceFramework(e.target.value)}
                className="config-select"
                disabled={loading}
              >
                <option value="HIPAA">HIPAA (US Healthcare)</option>
                <option value="GDPR">GDPR (EU)</option>
                <option value="PIPEDA">PIPEDA (Canada)</option>
                <option value="SOX">SOX (Financial)</option>
              </select>
              {isProcessed && (
                <small style={{ color: '#7f8c8d', display: 'block', marginTop: '5px' }}>
                  Change and click "Reprocess" to regenerate with new compliance
                </small>
              )}
            </div>
            
            <div className="config-card">
              <h3>🔗 System Status</h3>
              <button 
                onClick={testBackendConnection}
                className="btn-test-connection"
                disabled={loading}
              >
                Test Backend Connection
              </button>
              
              {isProcessed && (
                <div style={{ marginTop: '10px' }}>
                  <button 
                    onClick={handleReprocess}
                    className="btn-reprocess"
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      marginRight: '8px',
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🔄 Reprocess
                  </button>
                  <button 
                    onClick={handleReset}
                    className="btn-reset"
                    disabled={loading}
                    style={{
                      padding: '8px 12px',
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Start Over
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="upload-section">
          <div className="upload-card">
            <h2>📄 Upload Healthcare Document</h2>
            <p>Upload requirements documents (PDF, DOC, DOCX, TXT) for AI-powered test case generation</p>
            
            {file && (
              <div style={{ 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px', 
                margin: '10px 0',
                border: '1px solid #e9ecef'
              }}>
                <strong>Current File:</strong> {file.name}
                <span style={{ color: '#28a745', marginLeft: '10px' }}>
                  {isProcessed ? '✅ Processed' : '📤 Ready'}
                </span>
              </div>
            )}
            
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              disabled={loading}
              className="file-input"
            />
            
            {file && !loading && (
              <p style={{ fontSize: '14px', color: '#6c757d', marginTop: '8px' }}>
                💡 Tip: Upload a new file to replace current document, or change settings above and click "Reprocess"
              </p>
            )}
            
            {loading && (
              <div className="loading-indicator">
                <div className="spinner"></div>
                <p>🤖 AI is processing your healthcare document...</p>
                <p>Extracting requirements and generating test cases...</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                <h3>❌ Error</h3>
                <p>{error}</p>
                <button 
                  onClick={handleReset}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>✅ AI Processing Results</h2>
              <div className="results-meta">
                <span>📅 Processed: {new Date(results.processedAt).toLocaleString()}</span>
                <span>🔧 Methodology: {results.methodology}</span>
                <span>📋 Compliance: {results.complianceFramework}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card requirements">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <h3>{requirementsCount}</h3>
                  <p>Requirements Found</p>
                </div>
              </div>

              <div className="stat-card tests">
                <div className="stat-icon">🧪</div>
                <div className="stat-content">
                  <h3>{testCasesCount}</h3>
                  <p>Test Cases Generated</p>
                </div>
              </div>

              <div className="stat-card coverage">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <h3>{coveragePercent}%</h3>
                  <p>Compliance Coverage</p>
                </div>
              </div>
            </div>

            {testCases.length > 0 && (
              <div className="test-cases-preview">
                <h3>🧪 Generated Test Cases Preview</h3>
                <div className="test-cases-grid">
                  {testCases.slice(0, 3).map((test, index) => (
                    <div key={test.testId || index} className="test-case-card">
                      <div className="test-header">
                        <span className="test-id">{test.testId}</span>
                        <span className={`priority priority-${test.priority}`}>
                          {test.priority?.toUpperCase()}
                        </span>
                      </div>
                      <h4>{test.testName}</h4>
                      <p className="test-description">
                        {test.description?.substring(0, 150)}
                        {test.description?.length > 150 ? '...' : ''}
                      </p>
                      <div className="test-meta">
                        <span className="category">{test.category}</span>
                        <span className="risk">{test.riskLevel}</span>
                      </div>
                      <div className="compliance-tags">
                        {test.complianceRequirements?.slice(0, 2).map(comp => (
                          <span key={comp} className="compliance-tag">{comp}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {testCases.length > 3 && (
                  <p className="more-tests">
                    ... and {testCases.length - 3} more comprehensive test cases
                  </p>
                )}
              </div>
            )}

            {requirements.length > 0 && (
              <div className="requirements-preview">
                <h3>📋 Extracted Requirements Preview</h3>
                <div className="requirements-list">
                  {requirements.slice(0, 5).map((req, index) => (
                    <div key={req.id || index} className="requirement-item">
                      <div className="req-header">
                        <span className="req-category">{req.category || 'General'}</span>
                        {req.risk && <span className={`req-risk risk-${req.risk}`}>{req.risk.toUpperCase()}</span>}
                      </div>
                      <p>{req.text || req.description || JSON.stringify(req)}</p>
                    </div>
                  ))}
                </div>
                
                {requirements.length > 5 && (
                  <p className="more-requirements">
                    ... and {requirements.length - 5} more extracted requirements
                  </p>
                )}
              </div>
            )}

            <div className="action-buttons">
              <button 
                className="btn-primary"
                onClick={() => handleExport('csv')}
              >
                📊 Export CSV
              </button>
              <button 
                className="btn-secondary"
                onClick={() => handleExport('json')}
              >
                📤 Export JSON
              </button>
              <button 
                className="btn-secondary"
                onClick={() => handleExport('excel')}
              >
                📋 Export Excel
              </button>
            </div>
          </div>
        )}

        <div className="info-section">
          <div className="info-grid">
            <div className="info-card">
              <h3>🤖 AI-Powered Analysis</h3>
              <ul>
                <li>Advanced Document AI extracts requirements</li>
                <li>Gemini AI generates comprehensive test cases</li>
                <li>HIPAA compliance validation built-in</li>
                <li>Multi-methodology support (Agile/Waterfall/Hybrid)</li>
              </ul>
            </div>
            
            <div className="info-card">
              <h3>🏥 Healthcare Focus</h3>
              <ul>
                <li>HIPAA Privacy & Security Rules</li>
                <li>Clinical safety considerations</li>
                <li>PHI data protection testing</li>
                <li>Healthcare workflow validation</li>
              </ul>
            </div>
            
            <div className="info-card">
              <h3>🔧 Integration Ready</h3>
              <ul>
                <li>JIRA & TestRail export</li>
                <li>Excel & CSV formats</li>
                <li>CI/CD pipeline integration</li>
                <li>Audit trail & traceability</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;