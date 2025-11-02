// frontend/src/components/RequirementsEditor.js - FIXED (No Emojis)
import React, { useState } from 'react';
import './RequirementsEditor.css';

const RequirementsEditor = ({ 
  initialRequirements = [], 
  methodology = 'agile', 
  complianceFrameworks = ['hipaa'],
  onRegenerate 
}) => {
  const [requirements, setRequirements] = useState(
    initialRequirements.map((req, index) => ({
      id: req.id || `req-${index}`,
      text: typeof req === 'string' ? req : req.text || '',
      category: req.category || 'functional',
      confidence: req.confidence || 1.0
    }))
  );
  const [editingIndex, setEditingIndex] = useState(null);
  const [editText, setEditText] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);

  // Edit handlers
  const handleEditStart = (index) => {
    setEditingIndex(index);
    setEditText(requirements[index].text);
  };

  const handleEditSave = () => {
    if (editingIndex !== null && editText.trim()) {
      const updated = [...requirements];
      updated[editingIndex] = {
        ...updated[editingIndex],
        text: editText.trim()
      };
      setRequirements(updated);
      setEditingIndex(null);
      setEditText('');
    }
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const handleDelete = (index) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (newRequirement.trim()) {
      setRequirements([
        ...requirements,
        {
          id: `req-new-${Date.now()}`,
          text: newRequirement.trim(),
          category: 'functional',
          confidence: 1.0
        }
      ]);
      setNewRequirement('');
    }
  };

  // Regenerate tests with edited requirements
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    
    try {
      const frameworks = Array.isArray(complianceFrameworks) 
        ? complianceFrameworks 
        : [complianceFrameworks || 'hipaa'];

      console.log('Regenerating with:', {
        requirements: requirements.length,
        methodology,
        frameworks
      });

      const response = await fetch(
        'https://medtestai-backend-1067292712875.us-central1.run.app/api/workflow/regenerate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requirements: requirements.map(r => r.text),
            methodology: methodology,
            complianceFrameworks: frameworks
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Regeneration failed (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      console.log('Regeneration result:', result);
      
      if (result.success && onRegenerate) {
        onRegenerate(result);
      } else {
        throw new Error(result.error || 'Regeneration failed');
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(`Regeneration failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="requirements-editor">
      <div className="editor-header">
        <h3>Edit Requirements</h3>
        <p className="editor-subtitle">Modify, add, or remove requirements to regenerate test cases</p>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* Existing Requirements List */}
      {requirements.length > 0 && (
        <div className="requirements-list">
          <h4>Current Requirements ({requirements.length})</h4>
          {requirements.map((req, index) => (
            <div key={req.id || index} className="requirement-item">
              <div className="req-number">{index + 1}</div>
              
              {editingIndex === index ? (
                // Edit Mode
                <div className="req-edit-mode">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="req-textarea"
                    rows="3"
                    autoFocus
                  />
                  <div className="edit-buttons">
                    <button onClick={handleEditSave} className="save-btn">
                      Save
                    </button>
                    <button onClick={handleEditCancel} className="cancel-btn">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="req-view-mode">
                  <div className="req-text">
                    <p>{req.text}</p>
                    {req.category && (
                      <span className="req-category">{req.category}</span>
                    )}
                  </div>
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleEditStart(index)}
                      className="edit-btn"
                      title="Edit requirement"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(index)}
                      className="delete-btn"
                      title="Delete requirement"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Requirement */}
      <div className="add-requirement-section">
        <h4>Add New Requirement</h4>
        <div className="add-requirement-form">
          <textarea
            value={newRequirement}
            onChange={(e) => setNewRequirement(e.target.value)}
            placeholder="Enter new requirement text..."
            className="new-req-textarea"
            rows="3"
          />
          <button 
            onClick={handleAdd}
            disabled={!newRequirement.trim()}
            className="add-btn"
          >
            Add Requirement
          </button>
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="regenerate-section">
        <button 
          onClick={handleRegenerate}
          disabled={isRegenerating || requirements.length === 0}
          className="regenerate-btn"
        >
          {isRegenerating ? 'Regenerating Test Cases...' : 'Regenerate Test Cases'}
        </button>
        <p className="regenerate-note">
          This will generate new test cases based on your edited requirements.
        </p>
      </div>
    </div>
  );
};

export default RequirementsEditor;