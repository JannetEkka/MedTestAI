import React from 'react';

const DocumentUpload = ({ onUpload, processing }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onUpload(file);
    }
  };

  if (processing) {
    return (
      <div className="processing">
        <h2>🔄 Processing Healthcare Document...</h2>
        <div className="loader"></div>
        <p>Analyzing requirements with AI...</p>
      </div>
    );
  }

  return (
    <div className="upload-section">
      <h2>📄 Upload Healthcare Requirements</h2>
      <div className="upload-area">
        <input 
          type="file" 
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileUpload}
          className="file-input"
        />
        <p>Drop your healthcare requirements document</p>
        <small>Supports PDF, Word, Text files</small>
      </div>
    </div>
  );
};

export default DocumentUpload;