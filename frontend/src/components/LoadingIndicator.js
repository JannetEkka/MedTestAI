// frontend/src/components/LoadingIndicator.js
import React from 'react';
import './LoadingIndicator.css';

export default function LoadingIndicator({ message, progress }) {
  return (
    <div className="loading-indicator">
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
        {progress !== undefined && (
          <div className="loading-progress">{progress}%</div>
        )}
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}