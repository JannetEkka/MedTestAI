// frontend/src/components/ExportConfiguration.js
import React, { useState, useEffect } from 'react';
import './ExportConfiguration.css';

/**
 * Export Configuration Component
 * 
 * Allows users to specify:
 * - Where to save (Drive folder, project name)
 * - What to name the spreadsheet
 * - Who to share with
 * - How to organize (add to existing vs new sheet)
 */

const ExportConfiguration = ({ config = {}, onChange }) => {
  const [exportConfig, setExportConfig] = useState({
    exportType: 'google-sheets', // google-sheets, local-file
    driveFolder: '',
    driveFolderId: '',
    spreadsheetName: '',
    addToExisting: false,
    existingSpreadsheetId: '',
    shareWith: [],
    sharePermission: 'reader', // reader, commenter, writer
    projectName: '',
    sprintName: '',
    organizationType: 'new-sheet', // new-sheet, append-to-existing, new-tab
    tabName: '',
    autoNumber: true,
    includeTimestamp: true,
    notifyOnComplete: false,
    notificationEmail: '',
    ...config
  });

  const [newShareEmail, setNewShareEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    setExportConfig(prev => ({ ...prev, ...config }));
  }, [config]);

  const handleChange = (field, value) => {
    const updated = { ...exportConfig, [field]: value };
    setExportConfig(updated);
    onChange(updated);
  };

  const handleAddShareEmail = () => {
    const email = newShareEmail.trim();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (exportConfig.shareWith.includes(email)) {
      setEmailError('This email is already in the list');
      return;
    }
    
    handleChange('shareWith', [...exportConfig.shareWith, email]);
    setNewShareEmail('');
    setEmailError('');
  };

  const handleRemoveShareEmail = (email) => {
    handleChange('shareWith', exportConfig.shareWith.filter(e => e !== email));
  };

  const generateSpreadsheetName = () => {
    const parts = [];
    
    if (exportConfig.projectName) {
      parts.push(exportConfig.projectName);
    }
    
    if (exportConfig.sprintName) {
      parts.push(exportConfig.sprintName);
    }
    
    parts.push('Test Cases');
    
    if (exportConfig.includeTimestamp) {
      const date = new Date();
      const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
      parts.push(timestamp);
    }
    
    return parts.join(' - ');
  };

  const autoFillSpreadsheetName = () => {
    const name = generateSpreadsheetName();
    handleChange('spreadsheetName', name);
  };

  return (
    <div className="export-configuration">
      <div className="export-config-header">
        <h3>
          <span className="icon">📤</span>
          Export Configuration
        </h3>
        <p className="export-subtitle">
          Specify where and how to save your generated test cases
        </p>
      </div>

      {/* Export Type Selection */}
      <div className="config-section">
        <label className="section-label">Export Destination</label>
        <div className="export-type-grid">
          <button
            type="button"
            className={`export-type-btn ${exportConfig.exportType === 'google-sheets' ? 'active' : ''}`}
            onClick={() => handleChange('exportType', 'google-sheets')}
          >
            <span className="btn-icon">📊</span>
            <div className="btn-content">
              <h4>Google Sheets</h4>
              <p>Save to Google Drive with sharing</p>
            </div>
          </button>
          
          <button
            type="button"
            className={`export-type-btn ${exportConfig.exportType === 'local-file' ? 'active' : ''}`}
            onClick={() => handleChange('exportType', 'local-file')}
          >
            <span className="btn-icon">💾</span>
            <div className="btn-content">
              <h4>Local File</h4>
              <p>Download CSV/Excel to computer</p>
            </div>
          </button>
        </div>
      </div>

      {/* Google Sheets Configuration */}
      {exportConfig.exportType === 'google-sheets' && (
        <>
          {/* Project Information */}
          <div className="config-section">
            <label className="section-label">Project Information (Optional)</label>
            <div className="input-row">
              <div className="input-group">
                <label htmlFor="projectName">Project Name</label>
                <input
                  id="projectName"
                  type="text"
                  value={exportConfig.projectName}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  placeholder="e.g., Patient Portal EHR System"
                  className="config-input"
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="sprintName">Sprint/Phase Name</label>
                <input
                  id="sprintName"
                  type="text"
                  value={exportConfig.sprintName}
                  onChange={(e) => handleChange('sprintName', e.target.value)}
                  placeholder="e.g., Sprint 3 or Phase 1"
                  className="config-input"
                />
              </div>
            </div>
          </div>

          {/* Spreadsheet Name */}
          <div className="config-section">
            <label className="section-label">Spreadsheet Name *</label>
            <div className="name-input-wrapper">
              <input
                type="text"
                value={exportConfig.spreadsheetName}
                onChange={(e) => handleChange('spreadsheetName', e.target.value)}
                placeholder="Enter spreadsheet name"
                className="config-input spreadsheet-name-input"
                required
              />
              <button
                type="button"
                onClick={autoFillSpreadsheetName}
                className="auto-fill-btn"
                title="Auto-generate name from project info"
              >
                ✨ Auto-Generate
              </button>
            </div>
            {exportConfig.spreadsheetName && (
              <div className="preview-name">
                Preview: <strong>{exportConfig.spreadsheetName}</strong>
              </div>
            )}
          </div>

          {/* Organization Type */}
          <div className="config-section">
            <label className="section-label">How to Organize</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="organizationType"
                  value="new-sheet"
                  checked={exportConfig.organizationType === 'new-sheet'}
                  onChange={(e) => handleChange('organizationType', e.target.value)}
                />
                <div className="radio-content">
                  <h4>📄 Create New Spreadsheet</h4>
                  <p>Create a brand new Google Sheet</p>
                </div>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="organizationType"
                  value="append-to-existing"
                  checked={exportConfig.organizationType === 'append-to-existing'}
                  onChange={(e) => handleChange('organizationType', e.target.value)}
                />
                <div className="radio-content">
                  <h4>➕ Append to Existing Sheet</h4>
                  <p>Add test cases to existing spreadsheet</p>
                </div>
              </label>
              
              <label className="radio-option">
                <input
                  type="radio"
                  name="organizationType"
                  value="new-tab"
                  checked={exportConfig.organizationType === 'new-tab'}
                  onChange={(e) => handleChange('organizationType', e.target.value)}
                />
                <div className="radio-content">
                  <h4>📑 New Tab in Existing Sheet</h4>
                  <p>Add a new tab to existing spreadsheet</p>
                </div>
              </label>
            </div>
          </div>

          {/* Existing Spreadsheet Options */}
          {(exportConfig.organizationType === 'append-to-existing' || 
            exportConfig.organizationType === 'new-tab') && (
            <div className="config-section existing-sheet-config">
              <label className="section-label">Existing Spreadsheet ID *</label>
              <input
                type="text"
                value={exportConfig.existingSpreadsheetId}
                onChange={(e) => handleChange('existingSpreadsheetId', e.target.value)}
                placeholder="Paste spreadsheet ID from URL"
                className="config-input"
                required
              />
              <p className="help-text">
                📋 Find the ID in the spreadsheet URL: 
                <code>docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit</code>
              </p>
              
              {exportConfig.organizationType === 'new-tab' && (
                <div className="input-group" style={{ marginTop: '12px' }}>
                  <label htmlFor="tabName">New Tab Name</label>
                  <input
                    id="tabName"
                    type="text"
                    value={exportConfig.tabName}
                    onChange={(e) => handleChange('tabName', e.target.value)}
                    placeholder="e.g., Sprint 3 Tests"
                    className="config-input"
                  />
                </div>
              )}
            </div>
          )}

          {/* Drive Folder */}
          <div className="config-section">
            <label className="section-label">Google Drive Folder (Optional)</label>
            <input
              type="text"
              value={exportConfig.driveFolderId}
              onChange={(e) => handleChange('driveFolderId', e.target.value)}
              placeholder="Paste folder ID to save in specific folder"
              className="config-input"
            />
            <p className="help-text">
              📁 Leave empty to save in root Drive folder. Find folder ID in URL:
              <code>drive.google.com/drive/folders/<strong>FOLDER_ID</strong></code>
            </p>
          </div>

          {/* Sharing Configuration */}
          <div className="config-section">
            <label className="section-label">Share With</label>
            <div className="share-input-wrapper">
              <input
                type="email"
                value={newShareEmail}
                onChange={(e) => {
                  setNewShareEmail(e.target.value);
                  setEmailError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddShareEmail()}
                placeholder="Enter email address"
                className="config-input share-email-input"
              />
              <button
                type="button"
                onClick={handleAddShareEmail}
                className="add-email-btn"
              >
                ➕ Add
              </button>
            </div>
            {emailError && <p className="error-text">{emailError}</p>}
            
            {exportConfig.shareWith.length > 0 && (
              <div className="share-list">
                {exportConfig.shareWith.map((email, index) => (
                  <div key={index} className="share-item">
                    <span className="share-email">👤 {email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveShareEmail(email)}
                      className="remove-email-btn"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="permission-select-wrapper">
              <label htmlFor="sharePermission">Permission Level:</label>
              <select
                id="sharePermission"
                value={exportConfig.sharePermission}
                onChange={(e) => handleChange('sharePermission', e.target.value)}
                className="config-select"
              >
                <option value="reader">👁️ Viewer (Read only)</option>
                <option value="commenter">💬 Commenter (Can comment)</option>
                <option value="writer">✏️ Editor (Can edit)</option>
              </select>
            </div>
          </div>

          {/* Additional Options */}
          <div className="config-section">
            <label className="section-label">Additional Options</label>
            <div className="checkbox-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.autoNumber}
                  onChange={(e) => handleChange('autoNumber', e.target.checked)}
                />
                <span>🔢 Auto-number test cases sequentially</span>
              </label>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.includeTimestamp}
                  onChange={(e) => handleChange('includeTimestamp', e.target.checked)}
                />
                <span>🕒 Include timestamp in spreadsheet name</span>
              </label>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.notifyOnComplete}
                  onChange={(e) => handleChange('notifyOnComplete', e.target.checked)}
                />
                <span>📧 Send email notification when complete</span>
              </label>
            </div>
            
            {exportConfig.notifyOnComplete && (
              <div className="input-group" style={{ marginTop: '12px' }}>
                <label htmlFor="notificationEmail">Notification Email</label>
                <input
                  id="notificationEmail"
                  type="email"
                  value={exportConfig.notificationEmail}
                  onChange={(e) => handleChange('notificationEmail', e.target.value)}
                  placeholder="your@email.com"
                  className="config-input"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Local File Configuration */}
      {exportConfig.exportType === 'local-file' && (
        <>
          <div className="config-section">
            <label className="section-label">File Format</label>
            <div className="file-format-grid">
              <button
                type="button"
                className="format-btn"
                onClick={() => handleChange('fileFormat', 'csv')}
              >
                📄 CSV
              </button>
              <button
                type="button"
                className="format-btn"
                onClick={() => handleChange('fileFormat', 'excel')}
              >
                📊 Excel (.xlsx)
              </button>
              <button
                type="button"
                className="format-btn"
                onClick={() => handleChange('fileFormat', 'json')}
              >
                🔧 JSON
              </button>
            </div>
          </div>
          
          <div className="config-section">
            <label className="section-label">File Name</label>
            <input
              type="text"
              value={exportConfig.spreadsheetName || 'test-cases'}
              onChange={(e) => handleChange('spreadsheetName', e.target.value)}
              placeholder="Enter file name"
              className="config-input"
            />
          </div>
        </>
      )}

      {/* Configuration Summary */}
      <div className="config-summary">
        <h4>📋 Configuration Summary</h4>
        <ul>
          <li>
            <strong>Export Type:</strong> {exportConfig.exportType === 'google-sheets' ? 'Google Sheets' : 'Local File'}
          </li>
          {exportConfig.exportType === 'google-sheets' && (
            <>
              <li>
                <strong>Organization:</strong> {
                  exportConfig.organizationType === 'new-sheet' ? 'New Spreadsheet' :
                  exportConfig.organizationType === 'append-to-existing' ? 'Append to Existing' :
                  'New Tab in Existing'
                }
              </li>
              <li>
                <strong>Spreadsheet Name:</strong> {exportConfig.spreadsheetName || 'Not specified'}
              </li>
              {exportConfig.shareWith.length > 0 && (
                <li>
                  <strong>Shared With:</strong> {exportConfig.shareWith.length} {exportConfig.shareWith.length === 1 ? 'person' : 'people'}
                </li>
              )}
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ExportConfiguration;