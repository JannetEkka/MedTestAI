// src/components/ExportOptions.js
import React, { useState } from 'react';

const ExportOptions = ({ testCases = [], metadata = {} }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const handleExport = async (format) => {
    if (!testCases.length) {
      alert('No test cases available for export');
      return;
    }

    setIsExporting(true);
    
    try {
      console.log(`🔄 Exporting ${testCases.length} test cases as ${format}...`);

      const response = await fetch('/api/tests/export', {
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

        console.log(`✅ Export successful: ${result.exportedCount} test cases exported as ${format}`);
        showNotification(`Successfully exported ${result.exportedCount} test cases as ${format.toUpperCase()}`, 'success');
        
      } else {
        throw new Error(result.error || 'Export failed');
      }

    } catch (error) {
      console.error('Export error:', error);
      showNotification(`Export failed: ${error.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const showNotification = (message, type) => {
    // Simple notification system
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
      color: white;
      border-radius: 6px;
      z-index: 1000;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
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
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '120px'
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
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '120px'
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
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '120px'
          }}
        >
          {isExporting ? '⏳' : '📋'} Excel Export
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