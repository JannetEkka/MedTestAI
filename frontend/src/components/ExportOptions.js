// frontend/src/components/ExportOptions.js - UPDATED WITH FIXES
import React, { useState } from 'react';

const ExportOptions = ({ testCases = [], metadata = {} }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Use environment variable or fallback to localhost for development
  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  console.log('[ExportOptions] Component loaded');
  console.log('[ExportOptions] API_URL:', API_URL);
  console.log('[ExportOptions] Test cases count:', testCases?.length);

  const showNotification = (message, type = 'info') => {
    alert(message);
  };

  const handleExport = async (format) => {
    // Validate test cases
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      showNotification('⚠️ No test cases available for export. Please generate test cases first.', 'warning');
      console.error('[Export] No test cases to export');
      return;
    }

    console.log(`📦 [EXPORT] Starting ${format} export...`);
    console.log(`📊 [EXPORT] Test cases count: ${testCases.length}`);
    console.log(`📊 [EXPORT] First test case:`, testCases[0]);
    
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Handle Google Sheets export differently
      if (format === 'google-sheets') {
        console.log('📊 [EXPORT] Sending request to Google Sheets API...');
        
        const requestBody = { 
          testCases,
          metadata: {
            methodology: metadata.methodology || 'agile',
            complianceFramework: metadata.complianceFramework || metadata.compliance || 'HIPAA',
            exportDate: new Date().toISOString()
          },
          config: {
            includeCharts: true,
            colorCode: true,
            includeSummarySheet: true
          }
        };

        console.log('[EXPORT] Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${API_URL}/api/v1/export/google-sheets`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('[EXPORT] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EXPORT] Error response:', errorText);
          throw new Error(`Export failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[EXPORT] Result:', result);
        
        if (result.success) {
          console.log('✅ [EXPORT] Google Sheets export successful!');
          console.log(`📊 [EXPORT] Sheet URL: ${result.sheetUrl || result.spreadsheetUrl}`);
          
          // Open the sheet in new tab
          const url = result.sheetUrl || result.spreadsheetUrl;
          if (url) {
            window.open(url, '_blank');
          }
          
          setLastExport({
            format,
            timestamp: new Date(),
            count: result.updatedRows || testCases.length,
            filename: 'Google Sheets',
            url: url
          });
          
          showNotification(`✅ Exported ${testCases.length} test cases to Google Sheets!`, 'success');
        } else {
          throw new Error(result.error || 'Export failed');
        }
        
      } else {
        // Handle other formats (CSV, JSON, Excel, JIRA)
        console.log(`📄 [EXPORT] Sending ${format} export request...`);
        console.log(`📄 [EXPORT] API URL: ${API_URL}/api/tests/export`);
        
        const requestBody = {
          testCases: testCases,
          format: format.toLowerCase(),
          methodology: metadata.methodology || 'agile',
          compliance: metadata.complianceFramework || metadata.compliance || 'HIPAA'
        };

        console.log('[EXPORT] Request body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${API_URL}/api/tests/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        console.log('[EXPORT] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[EXPORT] Error response:', errorText);
          throw new Error(`Export failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('[EXPORT] Result:', result);
        
        if (result.success && result.data) {
          console.log(`✅ [EXPORT] ${format} export successful`);
          console.log(`📄 [EXPORT] Data length: ${result.data.length} characters`);
          
          // Create and trigger download
          let blob;
          if (result.encoding === 'base64') {
            // Decode base64 for Excel files
            const binaryString = atob(result.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            blob = new Blob([bytes], { 
              type: result.mimeType || 'application/octet-stream' 
            });
          } else {
            // Regular string data for CSV/JSON
            blob = new Blob([result.data], { 
              type: result.mimeType || 'text/plain'
            });
          }
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename || `medtestai-export-${format}-${Date.now()}.txt`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          setLastExport({
            format,
            timestamp: new Date(),
            count: result.count || testCases.length,
            filename: result.filename
          });
          
          showNotification(`✅ Exported ${testCases.length} test cases as ${format.toUpperCase()}!`, 'success');
        } else {
          throw new Error(result.error || 'Export failed - no data received');
        }
      }
      
    } catch (error) {
      console.error('[EXPORT] Error:', error);
      setExportError(error.message);
      showNotification(`❌ Export failed: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export-options">
      <div className="export-formats">
        <h4>📤 Select Export Format</h4>
        <div className="format-buttons">
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting || !testCases.length}
            className="export-btn csv-btn"
          >
            📄 CSV
          </button>
          
          <button
            onClick={() => handleExport('json')}
            disabled={isExporting || !testCases.length}
            className="export-btn json-btn"
          >
            🔧 JSON
          </button>
          
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting || !testCases.length}
            className="export-btn excel-btn"
          >
            📊 Excel
          </button>
          
          <button
            onClick={() => handleExport('jira')}
            disabled={isExporting || !testCases.length}
            className="export-btn jira-btn"
          >
            📋 JIRA
          </button>
          
          <button
            onClick={() => handleExport('google-sheets')}
            disabled={isExporting || !testCases.length}
            className="export-btn sheets-btn"
          >
            📊 Google Sheets
          </button>
        </div>
      </div>

      {isExporting && (
        <div className="export-loading">
          <div className="spinner"></div>
          <p>Exporting test cases...</p>
        </div>
      )}

      {exportError && (
        <div className="export-error">
          <p>❌ Export failed: {exportError}</p>
          <button onClick={() => setExportError(null)}>Dismiss</button>
        </div>
      )}

      {lastExport && !exportError && (
        <div className="export-success">
          <p>
            ✅ Last export: {lastExport.count} test cases as {lastExport.format.toUpperCase()}
          </p>
          <p className="export-time">
            {new Date(lastExport.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      {(!testCases || testCases.length === 0) && (
        <div className="export-warning">
          <p>⚠️ No test cases available. Please generate test cases first.</p>
        </div>
      )}

      <style jsx>{`
        .export-options {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .export-formats h4 {
          margin-bottom: 16px;
          color: #2c3e50;
        }

        .format-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .export-btn {
          padding: 12px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .export-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .csv-btn:hover:not(:disabled) {
          border-color: #4caf50;
          background: #f1f8f4;
        }

        .json-btn:hover:not(:disabled) {
          border-color: #2196f3;
          background: #e3f2fd;
        }

        .excel-btn:hover:not(:disabled) {
          border-color: #ff9800;
          background: #fff3e0;
        }

        .jira-btn:hover:not(:disabled) {
          border-color: #0052cc;
          background: #deebff;
        }

        .sheets-btn:hover:not(:disabled) {
          border-color: #34a853;
          background: #e6f4ea;
        }

        .export-loading {
          margin-top: 20px;
          text-align: center;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .export-error {
          margin-top: 20px;
          padding: 16px;
          background: #fee;
          border: 2px solid #fcc;
          border-radius: 8px;
          color: #c33;
        }

        .export-success {
          margin-top: 20px;
          padding: 16px;
          background: #e8f5e9;
          border: 2px solid #81c784;
          border-radius: 8px;
          color: #2e7d32;
        }

        .export-time {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .export-warning {
          margin-top: 20px;
          padding: 16px;
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 8px;
          color: #856404;
        }
      `}</style>
    </div>
  );
};

export default ExportOptions;