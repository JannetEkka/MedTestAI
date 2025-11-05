// frontend/src/components/TestResults.js - ABSOLUTE FIX FOR EXPORT
import React, { useState } from 'react';
import './TestResults.css';

const TestResults = ({ results, methodology, complianceFramework, onNewAnalysis }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);

  // FIXED: Correct data paths
  const testCases = results?.testCases || [];
  const requirements = results?.extractedData?.requirements || [];
  const summary = results?.summary || {};
  const metadata = results?.metadata || {};

  // Filter test cases by category
  const filteredTests = selectedCategory === 'all' 
    ? testCases 
    : testCases.filter(test => test.category === selectedCategory);

  // Get unique categories
  const categories = ['all', ...new Set(testCases.map(test => test.category))];

  // Priority color helper
  const getPriorityColor = (priority) => {
    const colors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50',
      critical: '#d32f2f'
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  // COMPLETELY FIXED EXPORT FUNCTION
  const handleExport = async (format) => {
    console.log(`[EXPORT START] Format: ${format}, Test cases: ${filteredTests.length}`);
    
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      if (!filteredTests || filteredTests.length === 0) {
        throw new Error('No test cases available to export.');
      }

      const API_URL = process.env.REACT_APP_BACKEND_URL || 
                      'https://medtestai-backend-1067292712875.us-central1.run.app';

      if (format === 'google-sheets') {
        // Google Sheets handling (unchanged)
        const folderId = prompt(
          'Enter your Google Drive Folder ID:\n\n' +
          'How to get it:\n' +
          '1. Open Google Drive\n' +
          '2. Open your folder\n' +
          '3. Copy ID from URL:\n' +
          '   drive.google.com/drive/folders/YOUR_FOLDER_ID\n\n' +
          'Folder ID:'
        );

        if (!folderId || folderId.trim() === '') {
          throw new Error('Folder ID is required');
        }

        console.log('Verifying folder access...');
        
        const verifyResponse = await fetch(`${API_URL}/api/drive/verify-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: folderId.trim() })
        });

        const verifyResult = await verifyResponse.json();
        
        if (!verifyResult.success) {
          throw new Error(`Cannot access folder: ${verifyResult.error || 'Unknown error'}`);
        }

        console.log(`Folder verified: ${verifyResult.folderName}`);

        const response = await fetch(`${API_URL}/api/export/drive-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testCases: filteredTests,
            folderId: folderId.trim(),
            fileName: 'MedTestAI Test Cases',
            methodology: methodology,
            compliance: complianceFramework
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
          throw new Error(errorData.error || `Export failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setExportSuccess(`Created "${result.fileName}" in your Drive folder!`);
          
          if (result.spreadsheetUrl) {
            setTimeout(() => {
              window.open(result.spreadsheetUrl, '_blank');
            }, 500);
          }
          
          setTimeout(() => setExportSuccess(null), 5000);
        } else {
          throw new Error(result.error || 'Export failed');
        }
        
      } else {
        // CSV, JSON, Excel - COMPLETELY REWRITTEN
        console.log(`[EXPORT] Calling API: ${API_URL}/api/tests/export`);
        console.log(`[EXPORT] Format: ${format}`);
        console.log(`[EXPORT] Test cases count: ${filteredTests.length}`);
        
        const requestBody = {
          testCases: filteredTests,
          format: format,
          methodology: methodology,
          complianceFrameworks: [complianceFramework]
        };
        
        console.log('[EXPORT] Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${API_URL}/api/tests/export`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log(`[EXPORT] Response status: ${response.status}`);
        console.log(`[EXPORT] Response headers:`, {
          contentType: response.headers.get('Content-Type'),
          contentLength: response.headers.get('Content-Length')
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EXPORT] Error response:', errorText);
          throw new Error(`Export failed: ${response.status}`);
        }

        // Parse JSON response
        const result = await response.json();
        console.log('[EXPORT] Parsed result:', {
          success: result.success,
          hasData: !!result.data,
          dataLength: result.data?.length,
          filename: result.filename,
          mimeType: result.mimeType,
          encoding: result.encoding
        });

        if (!result.success) {
          throw new Error(result.error || 'Export failed - backend returned success: false');
        }

        if (!result.data) {
          throw new Error('Export failed - no data received from backend');
        }

        // Create blob with CORRECT data extraction
        let blobData;
        let mimeType = result.mimeType || 'text/plain';
        
        if (result.encoding === 'base64') {
          console.log('[EXPORT] Decoding base64 data for Excel...');
          // Decode base64 for Excel files
          try {
            const binaryString = atob(result.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blobData = bytes;
            console.log('[EXPORT] Base64 decoded successfully, bytes:', bytes.length);
          } catch (e) {
            console.error('[EXPORT] Base64 decode failed:', e);
            throw new Error('Failed to decode Excel file');
          }
        } else {
          // Regular string data for CSV/JSON
          console.log('[EXPORT] Using string data directly');
          blobData = result.data;
        }
        
        // Create the blob
        const blob = new Blob([blobData], { type: mimeType });
        console.log('[EXPORT] Blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `medtestai-${format}-${Date.now()}.${format}`;
        link.style.display = 'none';
        
        console.log('[EXPORT] Download link created:', {
          href: url.substring(0, 50) + '...',
          download: link.download
        });
        
        // Trigger download
        document.body.appendChild(link);
        console.log('[EXPORT] Link appended to body, triggering click...');
        
        // Force click with timeout to ensure it works
        setTimeout(() => {
          link.click();
          console.log('[EXPORT] Click triggered');
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('[EXPORT] Cleanup complete');
          }, 100);
        }, 100);

        setExportSuccess(`Exported ${filteredTests.length} test cases as ${format.toUpperCase()}!`);
        setTimeout(() => setExportSuccess(null), 5000);
      }
    } catch (error) {
      console.error('[EXPORT ERROR]:', error);
      console.error('[EXPORT ERROR] Stack:', error.stack);
      setExportError(error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Rest of component unchanged...
  return (
    <div className="test-results">
      {/* Navigation Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'testcases' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('testcases')}
        >
          Test Cases ({testCases.length})
        </button>
        <button 
          className={activeTab === 'export' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>Test Generation Summary</h2>
            
            {/* Statistics Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{testCases.length}</div>
                <div className="stat-label">Total Test Cases</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{requirements.length}</div>
                <div className="stat-label">Requirements Analyzed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{methodology}</div>
                <div className="stat-label">Methodology</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{complianceFramework}</div>
                <div className="stat-label">Compliance</div>
              </div>
            </div>

            {/* Priority Distribution */}
            {summary.byPriority && (
              <div className="distribution-section">
                <h3>Priority Distribution</h3>
                <div className="priority-bars">
                  {Object.entries(summary.byPriority).map(([priority, count]) => (
                    <div key={priority} className="priority-bar-item">
                      <span className="priority-label">{priority}</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill"
                          style={{ 
                            width: `${(count / testCases.length) * 100}%`,
                            backgroundColor: getPriorityColor(priority)
                          }}
                        />
                      </div>
                      <span className="count-label">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Distribution */}
            {summary.byCategory && (
              <div className="distribution-section">
                <h3>Category Distribution</h3>
                <div className="category-grid">
                  {Object.entries(summary.byCategory).map(([category, count]) => (
                    <div key={category} className="category-card">
                      <div className="category-count">{count}</div>
                      <div className="category-name">{category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Cases Tab */}
        {activeTab === 'testcases' && (
          <div className="testcases-section">
            <div className="filter-bar">
              <label>
                Filter by Category:
                <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-filter"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </label>
              <span className="showing-count">
                Showing {filteredTests.length} of {testCases.length} test cases
              </span>
            </div>

            <div className="test-cases-list">
              {filteredTests.map((test, index) => (
                <div key={test.id || index} className="test-case-card">
                  <div className="test-header">
                    <h3>{test.testId || test.id} - {test.testName || test.name}</h3>
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(test.priority) }}
                    >
                      {test.priority}
                    </span>
                  </div>
                  
                  <div className="test-meta">
                    <span className="meta-item">Category: {test.category}</span>
                    {test.riskLevel && (
                      <span className="meta-item">Risk: {test.riskLevel}</span>
                    )}
                  </div>

                  <div className="test-description">
                    <strong>Description:</strong> {test.description}
                  </div>

                  {test.preconditions && test.preconditions.length > 0 && (
                    <div className="test-section">
                      <strong>Preconditions:</strong>
                      <ul>
                        {(Array.isArray(test.preconditions) ? test.preconditions : [test.preconditions]).map((pre, i) => (
                          <li key={i}>{pre}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {test.testSteps && test.testSteps.length > 0 && (
                    <div className="test-section">
                      <strong>Test Steps:</strong>
                      <ol>
                        {test.testSteps.map((step, i) => (
                          <li key={i}>
                            {typeof step === 'object' ? step.action : step.step || step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="test-section">
                    <strong>Expected Results:</strong> {test.expectedResults || test.expected}
                  </div>

                  {test.complianceRequirements && test.complianceRequirements.length > 0 && (
                    <div className="test-section compliance">
                      <strong>Compliance:</strong> {
                        Array.isArray(test.complianceRequirements) 
                          ? test.complianceRequirements.join(', ')
                          : test.complianceRequirements
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="export-section">
            <h2>Export Test Cases</h2>
            
            {exportError && (
              <div className="error-message" style={{ color: 'red', padding: '10px', marginBottom: '10px' }}>
                {exportError}
              </div>
            )}
            
            {exportSuccess && (
              <div className="success-message" style={{ color: 'green', padding: '10px', marginBottom: '10px' }}>
                {exportSuccess}
              </div>
            )}

            <div className="export-formats">
              <button
                onClick={() => handleExport('csv')}
                disabled={exportLoading}
                className="export-button csv"
              >
                {exportLoading ? 'Exporting...' : 'Export as CSV'}
              </button>
              
              <button
                onClick={() => handleExport('json')}
                disabled={exportLoading}
                className="export-button json"
              >
                {exportLoading ? 'Exporting...' : 'Export as JSON'}
              </button>
              
              <button
                onClick={() => handleExport('excel')}
                disabled={exportLoading}
                className="export-button excel"
              >
                {exportLoading ? 'Exporting...' : 'Export as Excel'}
              </button>

              <button
                onClick={() => handleExport('google-sheets')}
                disabled={exportLoading}
                className="export-button sheets"
              >
                {exportLoading ? 'Exporting...' : 'Export to Google Sheets'}
              </button>
            </div>

            <div className="export-info">
              <p>Exporting {filteredTests.length} test cases</p>
              <p className="export-note">
                Files will be downloaded to your default download folder.
                For Google Sheets, you'll need to provide a folder ID.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;