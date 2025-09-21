// DocumentUpload.js - Fixed with proper submit button and reupload functionality
import React, { useState, useCallback } from 'react';

const DocumentUpload = ({ onDocumentProcessed, disabled, methodology, compliance }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualRequirements, setManualRequirements] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PDF, Word documents, or text files only.';
    }
    if (file.size > maxSize) {
      return 'File size too large. Please upload files smaller than 10MB.';
    }
    return null;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      setSelectedFile(file);
      setFileError(null);
    }
  }, []);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      setSelectedFile(file);
      setFileError(null);
    }
  }, []);

  // NEW: Handle file submission with proper error handling
  const handleFileSubmit = async () => {
    if (!selectedFile) return;
    
    setProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('methodology', methodology);
      formData.append('complianceFramework', compliance);

      const response = await fetch(`https://medtestai-backend-1067292712875.us-central1.run.app/api/api/workflow/complete`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        onDocumentProcessed(result);
        // Clear the file after successful processing
        setSelectedFile(null);
        setFileError(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(result.error || 'Processing failed');
      }
      
    } catch (error) {
      console.error('File submission error:', error);
      setFileError(`Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // NEW: Handle manual requirements submission
  const handleManualSubmit = async () => {
    if (!manualRequirements.trim()) return;
    
    setProcessing(true);
    
    try {
      const response = await fetch(`https://medtestai-backend-1067292712875.us-central1.run.app/api/api/workflow/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirements: manualRequirements.split('\n').filter(req => req.trim()),
          methodology,
          complianceFramework: compliance
        })
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        onDocumentProcessed(result);
        // Clear manual input after successful processing
        setManualRequirements('');
      } else {
        throw new Error(result.error || 'Processing failed');
      }
      
    } catch (error) {
      console.error('Manual submission error:', error);
      setFileError(`Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // NEW: Reset/Reupload functionality
  const handleReset = () => {
    setSelectedFile(null);
    setFileError(null);
    setManualRequirements('');
    setProcessing(false);
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
  };

  // Manual entry mode
  if (manualMode) {
    return (
      <section className="upload-section">
        <div className="manual-entry">
          <div className="section-header">
            <h2>📝 Manual Requirements Entry</h2>
            <button 
              onClick={() => setManualMode(false)}
              className="btn-secondary"
              disabled={processing}
            >
              ← Back to Document Upload
            </button>
          </div>
          
          <div className="requirements-input">
            <label htmlFor="requirements">Enter Healthcare Requirements (one per line):</label>
            <textarea
              id="requirements"
              value={manualRequirements}
              onChange={(e) => setManualRequirements(e.target.value)}
              placeholder="Example:&#10;System shall implement role-based access control for PHI&#10;All patient data access must be logged with timestamps&#10;Medical records must be encrypted at rest and in transit&#10;User authentication must support multi-factor authentication"
              rows={10}
              disabled={processing}
            />
            <div className="input-help">
              <p>💡 <strong>Tips for better AI test generation:</strong></p>
              <ul>
                <li>Use clear, specific language (e.g., "System shall..." or "Application must...")</li>
                <li>Include compliance keywords (HIPAA, PHI, audit, security)</li>
                <li>Specify measurable criteria where possible</li>
                <li>One requirement per line for best results</li>
              </ul>
            </div>
          </div>

          {fileError && (
            <div className="error-message">
              ⚠️ {fileError}
            </div>
          )}

          <div className="action-buttons">
            <button 
              onClick={handleManualSubmit}
              disabled={processing || !manualRequirements.trim()}
              className="btn-primary"
            >
              {processing ? '🔄 Processing...' : '🚀 Generate Test Cases'}
            </button>
            
            <button 
              onClick={handleReset}
              disabled={processing}
              className="btn-secondary"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="upload-section">
      <div className="upload-options">
        <h2>📄 Document Processing Options</h2>
        <p>Upload healthcare documents or enter requirements manually for AI-powered test generation</p>
        
        {/* Document Upload */}
        <div className="upload-container">
          <div 
            className={`upload-area ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleChange}
              className="file-input"
              disabled={processing}
            />
            
            <label htmlFor="file-upload" className="upload-label">
              {selectedFile ? (
                <div className="file-selected-info">
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div className="file-status">✅ Ready to process</div>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">📁</div>
                  <div className="upload-text">
                    <div className="upload-title">Drop your healthcare document here</div>
                    <div className="upload-subtitle">or click to browse</div>
                    <div className="supported-formats">
                      Supports: PDF, Word (.docx, .doc), Text (.txt)
                    </div>
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Error Display */}
          {fileError && (
            <div className="error-message">
              ⚠️ {fileError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            {/* Submit Button - Only show when file is selected */}
            {selectedFile && (
              <button 
                onClick={handleFileSubmit}
                disabled={processing}
                className="btn-primary"
              >
                {processing ? '🔄 Processing Document...' : '🚀 Generate Test Cases'}
              </button>
            )}
            
            {/* Reset/Reupload Button */}
            {selectedFile && (
              <button 
                onClick={handleReset}
                disabled={processing}
                className="btn-secondary"
              >
                🔄 Choose Different File
              </button>
            )}
            
            {/* Manual Entry Option */}
            <button 
              onClick={() => setManualMode(true)}
              disabled={processing}
              className="btn-outline"
            >
              ✏️ Enter Requirements Manually
            </button>
          </div>
        </div>

        {/* Information Cards */}
        <div className="info-cards">
          <div className="info-card">
            <h3>🎯 Testing Methodologies</h3>
            <p>Currently using: <strong>{methodology}</strong></p>
            <p>Generate test cases based on {methodology === 'agile' ? 'user stories and sprints' : methodology === 'waterfall' ? 'requirements and phases' : 'hybrid development practices'}.</p>
          </div>
          
          <div className="info-card">
            <h3>🛡️ Compliance Framework</h3>
            <p>Currently using: <strong>{compliance}</strong></p>
            <p>All generated test cases will include {compliance} compliance requirements and validation steps.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DocumentUpload;