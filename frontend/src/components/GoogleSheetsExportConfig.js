// frontend/src/components/GoogleSheetsExportConfig.js
import React, { useState } from 'react';
import './GoogleSheetsExportConfig.css';

const GoogleSheetsExportConfig = ({ testCases, metadata, onExport }) => {
  const [config, setConfig] = useState({
    spreadsheetName: `MedTestAI-TestCases-${new Date().toISOString().split('T')[0]}`,
    includeCharts: true,
    includeSummarySheet: true,
    groupBy: 'category', // 'category', 'priority', 'compliance', 'none'
    includeTimestamps: true,
    colorCode: true,
    shareWith: [],
    makePublic: false,
    createNewSpreadsheet: true,
    existingSpreadsheetId: ''
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('Preparing export...');

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/sheets/export-configured`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testCases,
            metadata,
            config
          })
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setExportStatus('âœ… Export successful!');
        if (onExport) onExport(result);
        
        // Open the Google Sheet
        if (result.spreadsheetUrl) {
          window.open(result.spreadsheetUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus(`❌ Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="sheets-export-config">
      <h3>ðŸ"Š Configure Google Sheets Export</h3>

      <div className="config-section">
        <label>Spreadsheet Name</label>
        <input
          type="text"
          value={config.spreadsheetName}
          onChange={(e) => setConfig({...config, spreadsheetName: e.target.value})}
          className="config-input"
        />
      </div>

      <div className="config-section">
        <label>Group Tests By</label>
        <select
          value={config.groupBy}
          onChange={(e) => setConfig({...config, groupBy: e.target.value})}
          className="config-select"
        >
          <option value="none">No Grouping</option>
          <option value="category">Category</option>
          <option value="priority">Priority</option>
          <option value="compliance">Compliance Framework</option>
          <option value="methodology">Methodology</option>
        </select>
      </div>

      <div className="config-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.includeSummarySheet}
            onChange={(e) => setConfig({...config, includeSummarySheet: e.target.checked})}
          />
          <span>Include Summary Dashboard Sheet</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.includeCharts}
            onChange={(e) => setConfig({...config, includeCharts: e.target.checked})}
          />
          <span>Generate Charts & Visualizations</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.colorCode}
            onChange={(e) => setConfig({...config, colorCode: e.target.checked})}
          />
          <span>Color-code by Priority</span>
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={config.includeTimestamps}
            onChange={(e) => setConfig({...config, includeTimestamps: e.target.checked})}
          />
          <span>Include Generation Timestamps</span>
        </label>
      </div>

      <div className="config-section">
        <label>Destination</label>
        <div className="destination-options">
          <label className="radio-label">
            <input
              type="radio"
              checked={config.createNewSpreadsheet}
              onChange={() => setConfig({...config, createNewSpreadsheet: true})}
            />
            <span>Create New Spreadsheet</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              checked={!config.createNewSpreadsheet}
              onChange={() => setConfig({...config, createNewSpreadsheet: false})}
            />
            <span>Update Existing Spreadsheet</span>
          </label>
        </div>

        {!config.createNewSpreadsheet && (
          <input
            type="text"
            placeholder="Enter Spreadsheet ID"
            value={config.existingSpreadsheetId}
            onChange={(e) => setConfig({...config, existingSpreadsheetId: e.target.value})}
            className="config-input"
          />
        )}
      </div>

      {exportStatus && (
        <div className={`export-status ${exportStatus.includes('✅') ? 'success' : 'error'}`}>
          {exportStatus}
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="btn-export-sheets"
      >
        {isExporting ? 'ðŸ"„ Exporting...' : 'ðŸš€ Export to Google Sheets'}
      </button>
    </div>
  );
};

export default GoogleSheetsExportConfig;