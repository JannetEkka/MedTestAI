import React, { useState } from 'react';
import './MethodologySelector.css'; // You'll need to create this CSS file

const MethodologySelector = ({ onSelect, selected, onTestGenerate }) => {
  const [selectedMethodology, setSelectedMethodology] = useState(selected || '');

  const methodologies = [
    {
      id: 'agile',
      name: 'Agile Testing',
      description: 'Iterative development with user stories and continuous testing',
      useCase: 'Clinical software, rapid prototyping, EHR systems',
      features: [
        'User Stories & Acceptance Criteria',
        'Sprint-based Test Planning', 
        'Continuous Integration Testing',
        'Healthcare-specific DoD',
        'HIPAA Compliance Integration'
      ],
      icon: '🔄',
      color: '#4CAF50',
      compliance: 'HIPAA, HITECH, 21 CFR Part 11',
      timeframe: '2-4 week sprints',
      teamSize: '5-9 members',
      documentation: 'Lightweight, living documents'
    },
    {
      id: 'waterfall', 
      name: 'Waterfall Testing',
      description: 'Sequential development phases with comprehensive documentation',
      useCase: 'Medical devices, FDA submissions, regulatory compliance',
      features: [
        'Comprehensive Documentation',
        'Regulatory Compliance Focus',
        'Phase Gate Validation',
        'FDA 21 CFR Part 820 Alignment',
        'Extensive Test Planning'
      ],
      icon: '📋',
      color: '#2196F3',
      compliance: 'FDA 510(k), ISO 13485, IEC 62304',
      timeframe: '6-18 month cycles',
      teamSize: '10-20 members',
      documentation: 'Comprehensive, formal documentation'
    },
    {
      id: 'devops',
      name: 'DevOps Testing',
      description: 'Continuous integration, delivery, and automated testing',
      useCase: 'Cloud healthcare platforms, SaaS solutions, maintenance',
      features: [
        'CI/CD Pipeline Integration',
        'Automated Testing Suites',
        'Infrastructure Monitoring',
        'Security Testing Automation',
        'Compliance-as-Code'
      ],
      icon: '🚀',
      color: '#FF9800',
      compliance: 'SOC 2, HIPAA, Cloud Security',
      timeframe: 'Continuous deployment',
      teamSize: '3-8 members',
      documentation: 'Automated, code-based documentation'
    }
  ];

  const handleMethodologySelect = (methodologyId) => {
    setSelectedMethodology(methodologyId);
    if (onSelect) {
      onSelect(methodologyId);
    }
  };

  const handleGenerateTests = () => {
    if (selectedMethodology && onTestGenerate) {
      onTestGenerate(selectedMethodology);
    }
  };

  return (
    <div className="methodology-selector">
      <div className="selector-header">
        <h2>🎯 Select Testing Methodology</h2>
        <p>Choose the methodology that best fits your healthcare project requirements and regulatory environment.</p>
      </div>

      <div className="methodology-grid">
        {methodologies.map(method => (
          <div 
            key={method.id}
            className={`methodology-card ${selectedMethodology === method.id ? 'selected' : ''}`}
            onClick={() => handleMethodologySelect(method.id)}
            style={{ borderLeftColor: method.color }}
          >
            <div className="card-header">
              <span className="methodology-icon">{method.icon}</span>
              <h3>{method.name}</h3>
              <div className="selection-indicator">
                {selectedMethodology === method.id && <span className="checkmark">✓</span>}
              </div>
            </div>
            
            <div className="card-content">
              <p className="description">{method.description}</p>
              
              <div className="use-case">
                <strong>Best for:</strong> {method.useCase}
              </div>

              <div className="features-section">
                <h4>Key Features:</h4>
                <ul className="features-list">
                  {method.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="methodology-details">
                <div className="detail-row">
                  <span className="detail-label">📋 Compliance:</span>
                  <span className="detail-value">{method.compliance}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">⏱️ Timeframe:</span>
                  <span className="detail-value">{method.timeframe}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">👥 Team Size:</span>
                  <span className="detail-value">{method.teamSize}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">📄 Documentation:</span>
                  <span className="detail-value">{method.documentation}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMethodology && (
        <div className="selection-summary">
          <div className="summary-content">
            <h3>Selected: {methodologies.find(m => m.id === selectedMethodology)?.name}</h3>
            <p>Ready to generate healthcare-compliant test cases using {selectedMethodology} methodology.</p>
          </div>
          <button 
            className="generate-button"
            onClick={handleGenerateTests}
            style={{ backgroundColor: methodologies.find(m => m.id === selectedMethodology)?.color }}
          >
            Generate Test Cases
          </button>
        </div>
      )}

      <div className="methodology-comparison">
        <h3>📊 Quick Comparison</h3>
        <div className="comparison-table">
          <div className="comparison-header">
            <div>Criteria</div>
            <div>Agile</div>
            <div>Waterfall</div>
            <div>DevOps</div>
          </div>
          <div className="comparison-row">
            <div>Regulatory Approval</div>
            <div>Good</div>
            <div>Excellent</div>
            <div>Moderate</div>
          </div>
          <div className="comparison-row">
            <div>Speed to Market</div>
            <div>Fast</div>
            <div>Slow</div>
            <div>Very Fast</div>
          </div>
          <div className="comparison-row">
            <div>Change Flexibility</div>
            <div>High</div>
            <div>Low</div>
            <div>Very High</div>
          </div>
          <div className="comparison-row">
            <div>Documentation Level</div>
            <div>Medium</div>
            <div>High</div>
            <div>Low-Medium</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodologySelector;