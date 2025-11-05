import React, { useState, useEffect } from 'react';
import './ProcessingIndicator.css';

const ProcessingIndicator = ({ stage, methodology, complianceFramework }) => {
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  
  const processingStages = [
    {
      id: 'upload',
      name: 'Document Upload',
      description: 'Securely uploading to Google Cloud Storage with HIPAA compliance',
      icon: '☁️',
      estimatedTime: '5-10s'
    },
    {
      id: 'document_ai',
      name: 'Document AI Processing',
      description: 'Extracting text and identifying medical entities with Document AI',
      icon: '🔍',
      estimatedTime: '90-120s'
    },
    {
      id: 'vertex_ai',
      name: 'Healthcare Analysis',
      description: 'Analyzing requirements with Vertex AI healthcare models',
      icon: '⚕️',
      estimatedTime: '15-20s'
    },
    {
      id: 'gemini',
      name: 'Test Generation',
      description: 'Generating intelligent test cases with Gemini AI',
      icon: '🧠',
      estimatedTime: '30-45s'
    },
    {
      id: 'compliance',
      name: 'Compliance Validation',
      description: `Applying ${complianceFramework} compliance rules and validation`,
      icon: '🛡️',
      estimatedTime: '5-10s'
    },
    {
      id: 'finalization',
      name: 'Test Suite Assembly',
      description: `Organizing tests for ${methodology} methodology`,
      icon: '📋',
      estimatedTime: '3-5s'
    }
  ];

  useEffect(() => {
    // Update current stage based on the stage prop
    const stageIndex = processingStages.findIndex(s => 
      stage.toLowerCase().includes(s.name.toLowerCase().replace(/\s+/g, ''))
    );
    
    if (stageIndex !== -1) {
      setCurrentStageIndex(stageIndex);
      setProgress(((stageIndex + 1) / processingStages.length) * 100);
    }
  }, [stage, processingStages]);

  useEffect(() => {
    // Simulate smooth progress animation
    const timer = setInterval(() => {
      setProgress(prev => {
        const targetProgress = ((currentStageIndex + 1) / processingStages.length) * 100;
        if (prev < targetProgress) {
          return Math.min(prev + 1, targetProgress);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentStageIndex, processingStages.length]);

  return (
    <section className="processing-section">
      <div className="processing-container">
        {/* Header */}
        <div className="processing-header">
          <div className="processing-title">
            <div className="loading-spinner">🔄</div>
            <h2>AI Processing in Progress</h2>
          </div>
          <div className="processing-subtitle">
            <p>Healthcare-specific AI models are analyzing your document and generating comprehensive test cases</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {Math.round(progress)}% Complete
          </div>
        </div>

        {/* Current Stage Highlight */}
        <div className="current-stage">
          <div className="stage-icon">
            {processingStages[currentStageIndex]?.icon}
          </div>
          <div className="stage-details">
            <h3>{processingStages[currentStageIndex]?.name}</h3>
            <p>{stage}</p>
          </div>
          <div className="stage-time">
            Est. {processingStages[currentStageIndex]?.estimatedTime}
          </div>
        </div>

        {/* Stages List */}
        <div className="stages-list">
          {processingStages.map((stageItem, index) => (
            <div 
              key={stageItem.id}
              className={`stage-item ${
                index < currentStageIndex ? 'completed' : 
                index === currentStageIndex ? 'active' : 'pending'
              }`}
            >
              <div className="stage-indicator">
                <div className="stage-icon-small">
                  {index < currentStageIndex ? '✅' : 
                   index === currentStageIndex ? stageItem.icon : '⏳'}
                </div>
              </div>
              <div className="stage-content">
                <div className="stage-name">{stageItem.name}</div>
                <div className="stage-description">{stageItem.description}</div>
              </div>
              <div className="stage-status">
                {index < currentStageIndex ? '✅ Done' : 
                 index === currentStageIndex ? '⏳ Processing...' : '⏸️ Waiting'}
              </div>
            </div>
          ))}
        </div>

        {/* Technical Info */}
        <div className="technical-info">
          <h4>🔧 Processing Configuration</h4>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">Methodology:</span>
              <span className="config-value">{methodology.toUpperCase()}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Compliance:</span>
              <span className="config-value">{complianceFramework}</span>
            </div>
            <div className="config-item">
              <span className="config-label">AI Models:</span>
              <span className="config-value">Document AI + Gemini + Vertex AI</span>
            </div>
            <div className="config-item">
              <span className="config-label">Security:</span>
              <span className="config-value">HIPAA Compliant</span>
            </div>
          </div>
        </div>

        {/* AI Processing Insights */}
        <div className="ai-insights">
          <h4>🤖 What's Happening Behind the Scenes</h4>
          <div className="insights-list">
            <div className="insight-item">
              <span className="insight-icon">📊</span>
              <span>Document AI is extracting structured data and identifying medical entities</span>
            </div>
            <div className="insight-item">
              <span className="insight-icon">🎯</span>
              <span>Vertex AI models are understanding healthcare context and requirements</span>
            </div>
            <div className="insight-item">
              <span className="insight-icon">🔬</span>
              <span>Gemini is generating test scenarios specific to medical software</span>
            </div>
            <div className="insight-item">
              <span className="insight-icon">⚖️</span>
              <span>Compliance engine is validating against healthcare regulations</span>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="performance-stats">
          <div className="stat-item">
            <div className="stat-value">90%+</div>
            <div className="stat-label">Test Accuracy</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">70%</div>
            <div className="stat-label">Time Reduction</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">100%</div>
            <div className="stat-label">HIPAA Compliant</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">24/7</div>
            <div className="stat-label">AI Availability</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProcessingIndicator;
