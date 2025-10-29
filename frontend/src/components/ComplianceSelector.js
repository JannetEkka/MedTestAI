// frontend/src/components/ComplianceSelector.js
import React, { useState, useEffect } from 'react';
import './ComplianceSelector.css';

/**
 * Multi-Select Compliance Framework Component
 * 
 * Allows users to select multiple compliance standards that apply to their
 * healthcare application. The AI will generate test cases that satisfy ALL
 * selected compliance requirements.
 */

const COMPLIANCE_FRAMEWORKS = [
  {
    id: 'hipaa',
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    region: 'United States',
    description: 'Protects sensitive patient health information from being disclosed',
    icon: '🇺🇸',
    requirements: [
      'Access control and authentication',
      'Audit trails and logging',
      'Data encryption (at rest and in transit)',
      'Emergency access procedures',
      'Automatic logoff',
      'PHI protection and de-identification'
    ]
  },
  {
    id: 'fda-21-cfr-11',
    name: 'FDA 21 CFR Part 11',
    fullName: 'FDA Electronic Records; Electronic Signatures',
    region: 'United States',
    description: 'Defines criteria for electronic records and signatures in FDA-regulated systems',
    icon: '💊',
    requirements: [
      'Electronic signature validation',
      'Audit trail requirements',
      'System validation documentation',
      'Record retention policies',
      'Data integrity controls',
      'Change control procedures'
    ]
  },
  {
    id: 'gdpr',
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    region: 'European Union',
    description: 'Protects personal data and privacy of EU citizens',
    icon: '🇪🇺',
    requirements: [
      'Right to access and data portability',
      'Right to be forgotten (data deletion)',
      'Consent management',
      'Data breach notification (72 hours)',
      'Privacy by design',
      'Data processing agreements'
    ]
  },
  {
    id: 'hitrust',
    name: 'HITRUST CSF',
    fullName: 'HITRUST Common Security Framework',
    region: 'Global',
    description: 'Comprehensive security framework for healthcare organizations',
    icon: '🔒',
    requirements: [
      'Risk management framework',
      'Information protection program',
      'Access control management',
      'Incident management',
      'Business continuity planning',
      'Third-party assurance'
    ]
  },
  {
    id: 'soc2',
    name: 'SOC 2',
    fullName: 'Service Organization Control 2',
    region: 'Global',
    description: 'Security, availability, and confidentiality controls for service providers',
    icon: '🛡️',
    requirements: [
      'Security controls and monitoring',
      'Availability and performance',
      'Processing integrity',
      'Confidentiality controls',
      'Privacy safeguards',
      'Change management procedures'
    ]
  },
  {
    id: 'iso-13485',
    name: 'ISO 13485',
    fullName: 'Medical Devices Quality Management',
    region: 'International',
    description: 'Quality management systems for medical device manufacturers',
    icon: '🏥',
    requirements: [
      'Design and development controls',
      'Risk management processes',
      'Software validation requirements',
      'Document control',
      'Traceability and recall procedures',
      'Post-market surveillance'
    ]
  },
  {
    id: 'iso-27001',
    name: 'ISO 27001',
    fullName: 'Information Security Management',
    region: 'International',
    description: 'Information security management system standard',
    icon: '🔐',
    requirements: [
      'Information security policies',
      'Asset management',
      'Access control',
      'Cryptography',
      'Security incident management',
      'Business continuity'
    ]
  },
  {
    id: 'abdm',
    name: 'ABDM',
    fullName: 'Ayushman Bharat Digital Mission',
    region: 'India',
    description: 'India\'s national digital health ecosystem standards',
    icon: '🇮🇳',
    requirements: [
      'Health ID integration',
      'Healthcare professional registry',
      'Health facility registry',
      'Electronic health records standards',
      'Consent management framework',
      'Interoperability standards'
    ]
  }
];

const ComplianceSelector = ({ selectedCompliances = [], onChange }) => {
  const [selected, setSelected] = useState(selectedCompliances);
  const [showDetails, setShowDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSelected(selectedCompliances);
  }, [selectedCompliances]);

  const handleToggle = (complianceId) => {
    const newSelected = selected.includes(complianceId)
      ? selected.filter(id => id !== complianceId)
      : [...selected, complianceId];
    
    setSelected(newSelected);
    onChange(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = COMPLIANCE_FRAMEWORKS.map(f => f.id);
    setSelected(allIds);
    onChange(allIds);
  };

  const handleClearAll = () => {
    setSelected([]);
    onChange([]);
  };

  const filteredFrameworks = COMPLIANCE_FRAMEWORKS.filter(framework =>
    framework.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    framework.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    framework.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSelectedSummary = () => {
    if (selected.length === 0) return 'No compliance frameworks selected';
    if (selected.length === 1) {
      const framework = COMPLIANCE_FRAMEWORKS.find(f => f.id === selected[0]);
      return framework ? framework.name : '';
    }
    return `${selected.length} frameworks selected`;
  };

  return (
    <div className="compliance-selector">
      <div className="compliance-header">
        <h3>
          <span className="icon">🌐</span>
          Compliance Frameworks
        </h3>
        <p className="compliance-subtitle">
          Select all compliance standards that apply to your healthcare application.
          Test cases will be generated to satisfy ALL selected requirements.
        </p>
      </div>

      <div className="compliance-controls">
        <div className="compliance-search">
          <input
            type="text"
            placeholder="Search frameworks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="compliance-actions">
          <button 
            onClick={handleSelectAll}
            className="action-btn select-all"
            title="Select all frameworks"
          >
            ✅ Select All
          </button>
          <button 
            onClick={handleClearAll}
            className="action-btn clear-all"
            title="Clear selection"
          >
            ❌ Clear All
          </button>
        </div>
      </div>

      <div className="compliance-summary">
        <span className="summary-icon">📋</span>
        <span className="summary-text">{getSelectedSummary()}</span>
        {selected.length > 0 && (
          <span className="summary-count">{selected.length}</span>
        )}
      </div>

      <div className="compliance-grid">
        {filteredFrameworks.map(framework => {
          const isSelected = selected.includes(framework.id);
          
          return (
            <div
              key={framework.id}
              className={`compliance-card ${isSelected ? 'selected' : ''}`}
            >
              <label className="compliance-label">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(framework.id)}
                  className="compliance-checkbox"
                />
                
                <div className="compliance-content">
                  <div className="compliance-main">
                    <span className="compliance-icon">{framework.icon}</span>
                    <div className="compliance-info">
                      <h4 className="compliance-name">{framework.name}</h4>
                      <p className="compliance-full-name">{framework.fullName}</p>
                    </div>
                    <span className="compliance-region">{framework.region}</span>
                  </div>
                  
                  <p className="compliance-description">{framework.description}</p>
                  
                  <button
                    type="button"
                    className="show-details-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDetails(showDetails === framework.id ? null : framework.id);
                    }}
                  >
                    {showDetails === framework.id ? '▲ Hide' : '▼ Show'} Requirements
                  </button>
                  
                  {showDetails === framework.id && (
                    <div className="compliance-requirements">
                      <ul>
                        {framework.requirements.map((req, idx) => (
                          <li key={idx}>
                            <span className="req-bullet">✓</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {filteredFrameworks.length === 0 && (
        <div className="no-results">
          <p>No frameworks found matching "{searchTerm}"</p>
        </div>
      )}

      {selected.length > 0 && (
        <div className="compliance-footer">
          <div className="selected-tags">
            {selected.map(id => {
              const framework = COMPLIANCE_FRAMEWORKS.find(f => f.id === id);
              return framework ? (
                <span key={id} className="selected-tag">
                  {framework.icon} {framework.name}
                  <button
                    onClick={() => handleToggle(id)}
                    className="remove-tag"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceSelector;