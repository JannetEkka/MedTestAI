// frontend/src/components/ExportOptions.js
import React, { useState } from 'react';

const ExportOptions = ({ testCases = [], metadata = {} }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);
  const [exportError, setExportError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://medtestai-backend-1067292712875.us-central1.run.app';

  const handleExport = async (format) => {
    if (!testCases.length) {
      showNotification('⚠️ No test cases available for export', 'warning');
      return;
    }

    console.log(`🔄 [EXPORT] Starting ${format} export...`);
    console.log(`📊 [EXPORT] Test cases count: ${testCases.length}`);
    
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Handle Google Sheets export differently
      if (format === 'google-sheets') {
        console.log('📊 [EXPORT] Sending request to Google Sheets API...');
        
        const response = await fetch(`${API_URL}/api/v1/export/google-sheets`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            testCases,
            methodology: metadata.methodology || 'agile',
            compliance: metadata.complianceFramework || 'HIPAA'
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('✅ [EXPORT] Google Sheets export successful!');
          console.log(`📊 [EXPORT] Sheet URL: ${result.sheetUrl}`);
          
          // Open the sheet in new tab
          window.open(result.sheetUrl, '_blank');
          
          setLastExport({
            format,
            timestamp: new Date(),
            count: result.updatedRows || testCases.length,
            filename: 'Google Sheets'
          });
          
          showNotification(`✅ Exported ${testCases.length} test cases to Google Sheets!`, 'success');
        } else {
          throw new Error(result.error || 'Export failed');
        }
        
      } else {
        // Handle other formats (CSV, JSON, Excel)
        console.log(`📄 [EXPORT] Sending ${format} export request...`);
        
        const response = await fetch(`${API_URL}/api/tests/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testCases: testCases,
            format: format.toLowerCase(),
            methodology: metadata.methodology || 'agile',
            compliance: metadata.complianceFramework || 'HIPAA'
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Export failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ [EXPORT] ${format} export successful`);
          
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

          setLastExport({
            format,
            timestamp: new Date(),
            count: result.exportedCount || testCases.length,
            filename: link.download
          });

          console.log(`✅ [EXPORT] Download triggered: ${link.download}`);
          showNotification(`✅ Exported ${result.exportedCount} test cases as ${format.toUpperCase()}`, 'success');
          
        } else {
          throw new Error(result.error || 'Export failed');
        }
      }

    } catch (error) {
      console.error('❌ [EXPORT] Export failed:', error);
      setExportError(error.message);
      showNotification(`❌ Export failed: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'success' ? '#27ae60' : type === 'warning' ? '#f39c12' : '#e74c3c'};
      color: white;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      margin: '20px 0'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '16px' }}>
        📊 Export Test Cases
      </h3>
      
      <div style={{ marginBottom: '16px', color: '#7f8c8d', fontSize: '14px' }}>
        {testCases.length} test cases • {metadata.complianceFramework || 'HIPAA'} compliant
      </div>

      {exportError && (
        <div style={{
          padding: '12px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33',
          marginBottom: '16px'
        }}>
          ⚠️ {exportError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => handleExport('csv')}
          disabled={isExporting || !testCases.length}
          style={{
            padding: '12px 16px',
            border: '2px solid #27ae60',
            borderRadius: '6px',
            background: 'white',
            color: '#27ae60',
            cursor: isExporting || !testCases.length ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '140px',
            opacity: isExporting || !testCases.length ? 0.6 : 1
          }}
        >
          {isExporting ? '⏳' : '📊'} CSV Export
        </button>

        <button 
          onClick={() => handleExport('json')}
          disabled={isExporting || !testCases.length}
          style={{
            padding: '12px 16px',
            border: '2px solid #3498db',
            borderRadius: '6px',
            background: 'white',
            color: '#3498db',
            cursor: isExporting || !testCases.length ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '140px',
            opacity: isExporting || !testCases.length ? 0.6 : 1
          }}
        >
          {isExporting ? '⏳' : '🔧'} JSON Export
        </button>

        <button 
          onClick={() => handleExport('excel')}
          disabled={isExporting || !testCases.length}
          style={{
            padding: '12px 16px',
            border: '2px solid #e67e22',
            borderRadius: '6px',
            background: 'white',
            color: '#e67e22',
            cursor: isExporting || !testCases.length ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '140px',
            opacity: isExporting || !testCases.length ? 0.6 : 1
          }}
        >
          {isExporting ? '⏳' : '📋'} Excel Export
        </button>

        <button 
          onClick={() => handleExport('google-sheets')}
          disabled={isExporting || !testCases.length}
          style={{
            padding: '12px 16px',
            border: '2px solid #34A853',
            borderRadius: '6px',
            background: 'white',
            color: '#34A853',
            cursor: isExporting || !testCases.length ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '160px',
            opacity: isExporting || !testCases.length ? 0.6 : 1
          }}
        >
          {isExporting ? '⏳' : '📊'} Google Sheets
        </button>
      </div>

      {lastExport && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <div style={{ color: '#27ae60', fontWeight: '500' }}>
            ✅ Last export: {lastExport.count} test cases as {lastExport.format}
          </div>
          <div style={{ color: '#7f8c8d', fontSize: '12px' }}>
            {lastExport.timestamp.toLocaleString()} • {lastExport.filename}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportOptions;