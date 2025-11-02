// frontend/src/components/TestResults.js - FIXED ALL EXPORTS
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

  // FIXED: Complete export function with correct endpoints
  const handleExport = async (format) => {
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      if (!filteredTests || filteredTests.length === 0) {
        throw new Error('No test cases available to export.');
      }

      console.log(`Exporting ${filteredTests.length} test cases as ${format}`);

      const API_URL = process.env.REACT_APP_BACKEND_URL || 
                      'https://medtestai-backend-1067292712875.us-central1.run.app';

      if (format === 'google-sheets') {
        // Google Sheets - Ask for Drive folder
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
        
        // Verify folder
        const verifyResponse = await fetch(`${API_URL}/api/drive/verify-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: folderId.trim() })
        });

        const verifyResult = await verifyResponse.json();
        
        if (!verifyResult.success) {
          throw new Error(`Cannot access folder: ${verifyResult.error || 'Unknown error'}`);
        }

        console.log(`✅ Folder verified: ${verifyResult.folderName}`);

        // Export to folder
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
          setExportSuccess(`✅ Created "${result.fileName}" in your Drive folder!`);
          
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
        // FIXED: CSV, JSON, Excel - Use correct endpoint
        const response = await fetch(`${API_URL}/api/tests/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testCases: filteredTests,
            format: format, // 'csv', 'json', or 'excel'
            methodology: methodology,
            complianceFrameworks: [complianceFramework]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Export failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          // Create and download file
          const blob = new Blob([result.data], { 
            type: result.mimeType || 'text/plain'
          });
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename || `medtestai-${format}-${Date.now()}.txt`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          setExportSuccess(`✅ Exported ${filteredTests.length} test cases as ${format.toUpperCase()}!`);
          setTimeout(() => setExportSuccess(null), 5000);
        } else {
          throw new Error(result.error || 'Export failed');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px'
    },
    tabs: {
      display: 'flex',
      borderBottom: '2px solid #e1e8ed',
      marginBottom: '24px'
    },
    tab: {
      padding: '12px 24px',
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      fontSize: '16px',
      fontWeight: '600',
      color: '#657786',
      borderBottom: '3px solid transparent',
      transition: 'all 0.3s ease'
    },
    activeTab: {
      color: '#667eea',
      borderBottomColor: '#667eea'
    },
    button: {
      padding: '12px 24px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      marginRight: '12px'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
    },
    secondaryButton: {
      background: 'white',
      color: '#667eea',
      border: '2px solid #667eea'
    },
    sheetsButton: {
      background: 'linear-gradient(135deg, #34A853 0%, #0F9D58 100%)',
      color: 'white',
      boxShadow: '0 4px 12px rgba(52, 168, 83, 0.3)'
    },
    alert: {
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    successAlert: {
      background: '#d4edda',
      border: '1px solid #c3e6cb',
      color: '#155724'
    },
    errorAlert: {
      background: '#f8d7da',
      border: '1px solid #f5c6cb',
      color: '#721c24'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'overview' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'tests' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('tests')}
        >
          Test Cases ({testCases.length})
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'export' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
      </div>

      {activeTab === 'export' && (
        <div>
          <h2 style={{ marginBottom: '24px' }}>Export Test Cases</h2>
          
          {exportError && (
            <div style={{ ...styles.alert, ...styles.errorAlert }}>
              {exportError}
            </div>
          )}

          {exportSuccess && (
            <div style={{ ...styles.alert, ...styles.successAlert }}>
              {exportSuccess}
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Select Format:</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  ...styles.button,
                  ...(exportFormat === 'csv' ? styles.primaryButton : styles.secondaryButton)
                }}
                onClick={() => setExportFormat('csv')}
                disabled={exportLoading}
              >
                CSV
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(exportFormat === 'json' ? styles.primaryButton : styles.secondaryButton)
                }}
                onClick={() => setExportFormat('json')}
                disabled={exportLoading}
              >
                JSON
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(exportFormat === 'excel' ? styles.primaryButton : styles.secondaryButton)
                }}
                onClick={() => setExportFormat('excel')}
                disabled={exportLoading}
              >
                EXCEL
              </button>
              <button
                style={{
                  ...styles.button,
                  ...(exportFormat === 'google-sheets' ? styles.sheetsButton : styles.secondaryButton)
                }}
                onClick={() => setExportFormat('google-sheets')}
                disabled={exportLoading}
              >
                GOOGLE SHEETS
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <p><strong>Export Details:</strong></p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Test Cases: {filteredTests.length}</li>
              <li>Methodology: {methodology}</li>
              <li>Compliance: {complianceFramework}</li>
              {exportFormat === 'google-sheets' && (
                <li style={{ color: '#34A853', fontWeight: 'bold' }}>
                  Will prompt for your Drive folder ID
                </li>
              )}
            </ul>
          </div>

          <button
            onClick={() => handleExport(exportFormat)}
            disabled={exportLoading || filteredTests.length === 0}
            style={{
              ...styles.button,
              ...(exportFormat === 'google-sheets' ? styles.sheetsButton : styles.primaryButton),
              width: '100%',
              opacity: exportLoading || filteredTests.length === 0 ? 0.6 : 1
            }}
          >
            {exportLoading ? 'Exporting...' : 
             exportFormat === 'google-sheets' ? 'Export to Google Drive Folder' :
             `Export as ${exportFormat.toUpperCase()}`}
          </button>

          {filteredTests.length === 0 && (
            <p style={{ marginTop: '16px', color: '#666', textAlign: 'center' }}>
              No test cases available to export.
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          onClick={onNewAnalysis}
          style={{
            ...styles.button,
            ...styles.secondaryButton
          }}
        >
          New Analysis
        </button>
      </div>
    </div>
  );
};

export default TestResults;