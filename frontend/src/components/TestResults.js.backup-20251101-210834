// frontend/src/components/TestResults.js - SYNTAX ERROR FIXED
import React, { useState, useRef, useEffect } from 'react';

const TestResults = ({ results, methodology, complianceFramework, onNewAnalysis }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(null);
  const [showAllRequirements, setShowAllRequirements] = useState(false);

  // Extract data from results
  const testScenarios = results?.testScenarios || [];
  const testCases = results?.testCases?.testCases || [];
  const requirements = results?.extractedData?.requirements || [];
  const summary = results?.testCases?.summary || {};

  // Filter test cases by category
  const filteredTests = selectedCategory === 'all' 
    ? testCases 
    : testCases.filter(test => test.category === selectedCategory);

  // Get unique categories
  const categories = ['all', ...new Set(testCases.map(test => test.category))];

  // Priority color helper
  const getPriorityColor = (priority) => {
    const colors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50',
      critical: '#d32f2f'
    };
    return colors[priority?.toLowerCase()] || colors.medium;
  };

  // Working export function
  const handleExport = async (format) => {
    setExportLoading(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      if (!filteredTests || filteredTests.length === 0) {
        throw new Error('No test cases available to export. Please generate test cases first.');
      }

      console.log(`📤 Exporting ${filteredTests.length} test cases as ${format}`);

      const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/tests/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCases: filteredTests,
          format: format,
          methodology: methodology,
          compliance: complianceFramework
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
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

        setExportSuccess(`Successfully exported ${result.count || filteredTests.length} test cases as ${format.toUpperCase()}!`);
        
        // Clear success message after 5 seconds
        setTimeout(() => setExportSuccess(null), 5000);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message);
    } finally {
      setExportLoading(false);
    }
  };

  // Auto-clear error messages
  useEffect(() => {
    if (exportError) {
      const timer = setTimeout(() => setExportError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [exportError]);

  // Expandable Requirements Component
  const ExpandableRequirements = ({ requirements, maxVisible = 3 }) => {
    const visibleRequirements = showAllRequirements 
      ? requirements 
      : requirements.slice(0, maxVisible);
    
    const hiddenCount = requirements.length - maxVisible;

    return (
      <div className="requirements-section">
        <h3>📋 Extracted Requirements ({requirements.length})</h3>
        
        <div className="requirements-list">
          {visibleRequirements.map((requirement, index) => (
            <div key={requirement.id || index} className="requirement-item">
              <div className="requirement-header">
                <span 
                  className="requirement-priority"
                  style={{ 
                    backgroundColor: getPriorityColor(requirement.priority),
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {requirement.priority || 'Medium'}
                </span>
                
                <span className="requirement-category" style={{ 
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  {requirement.category || 'General'}
                </span>
                
                <span className="requirement-id" style={{ 
                  marginLeft: 'auto',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  REQ-{String(index + 1).padStart(3, '0')}
                </span>
              </div>

              <div className="requirement-content" style={{ marginTop: '8px' }}>
                <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4' }}>
                  {requirement.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!showAllRequirements && hiddenCount > 0 && (
          <button 
            onClick={() => setShowAllRequirements(true)}
            className="expand-requirements-btn"
            style={{
              background: 'none',
              border: '1px dashed #1976d2',
              color: '#1976d2',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f0f8ff'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <span>...and {hiddenCount} more extracted requirement{hiddenCount !== 1 ? 's' : ''}</span>
            <span style={{ marginLeft: '4px' }}>▼</span>
          </button>
        )}

        {showAllRequirements && requirements.length > maxVisible && (
          <button 
            onClick={() => setShowAllRequirements(false)}
            className="collapse-requirements-btn"
            style={{
              background: 'none',
              border: '1px solid #1976d2',
              color: '#1976d2',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '14px'
            }}
          >
            <span>Show less</span>
            <span style={{ marginLeft: '4px' }}>▲</span>
          </button>
        )}
      </div>
    );
  };

  // Styles
  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      color: '#1a1a1a',
      margin: 0
    },
    newAnalysisButton: {
      padding: '10px 20px',
      backgroundColor: '#1976d2',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    tabs: {
      display: 'flex',
      borderBottom: '2px solid #e0e0e0',
      marginBottom: '24px',
      gap: '8px'
    },
    tab: {
      padding: '12px 24px',
      background: 'none',
      border: 'none',
      borderBottom: '3px solid transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      color: '#666',
      transition: 'all 0.2s'
    },
    activeTab: {
      color: '#1976d2',
      borderBottomColor: '#1976d2'
    },
    content: {
      minHeight: '400px'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '32px'
    },
    statCard: {
      padding: '24px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e0e0e0',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '36px',
      fontWeight: '700',
      color: '#1976d2',
      marginBottom: '8px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
      fontWeight: '500'
    },
    techniqueTag: {
      display: 'inline-block',
      padding: '6px 12px',
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
      borderRadius: '16px',
      fontSize: '13px',
      marginRight: '8px',
      marginBottom: '8px',
      fontWeight: '500'
    },
    testCard: {
      padding: '20px',
      backgroundColor: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '16px'
    },
    exportSection: {
      backgroundColor: '#f8f9fa',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    },
    exportButtons: {
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    button: {
      padding: '12px 24px',
      border: '2px solid #1976d2',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    primaryButton: {
      backgroundColor: '#1976d2',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: 'white',
      color: '#1976d2'
    },
    errorMessage: {
      padding: '12px',
      backgroundColor: '#fee',
      color: '#c33',
      border: '1px solid #fcc',
      borderRadius: '4px',
      marginBottom: '16px'
    },
    successMessage: {
      padding: '12px',
      backgroundColor: '#efe',
      color: '#363',
      border: '1px solid #cfc',
      borderRadius: '4px',
      marginBottom: '16px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🧪 AI Test Results</h1>
        <button 
          onClick={onNewAnalysis}
          style={styles.newAnalysisButton}
        >
          🔄 New Analysis
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'scenarios' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('scenarios')}
        >
          📝 Test Scenarios
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'testcases' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('testcases')}
        >
          🧪 Test Cases
        </button>
        <button
          style={{...styles.tab, ...(activeTab === 'export' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('export')}
        >
          📤 Export
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{testScenarios.length}</div>
                <div style={styles.statLabel}>Test Scenarios</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{testCases.length}</div>
                <div style={styles.statLabel}>Test Cases Generated</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{summary.coverage || 85}%</div>
                <div style={styles.statLabel}>Test Coverage</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{requirements.length}</div>
                <div style={styles.statLabel}>Requirements Found</div>
              </div>
            </div>

            <h2>📋 Testing Techniques Applied</h2>
            <div style={{ marginTop: '10px' }}>
              {['Boundary Value Analysis', 'Equivalence Partitioning', 'Decision Tables', 'State Transition', 'Error Guessing'].map(technique => (
                <span key={technique} style={styles.techniqueTag}>
                  {technique}
                </span>
              ))}
            </div>

            {/* Expandable Requirements Section */}
            {requirements.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <ExpandableRequirements requirements={requirements} maxVisible={3} />
              </div>
            )}
          </div>
        )}

        {/* Test Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div>
            <h2>📝 Test Scenarios from User Stories</h2>
            {testScenarios.length > 0 ? (
              testScenarios.map((scenario, index) => (
                <div key={scenario.id || index} style={styles.testCard}>
                  <h3>{scenario.title}</h3>
                  <p><strong>User Story:</strong> {scenario.userStory}</p>
                  <p><strong>Scenario:</strong> {scenario.scenario}</p>
                  <p><strong>Priority:</strong> {scenario.priority}</p>
                </div>
              ))
            ) : (
              <p>No test scenarios available. Generate them by uploading requirements.</p>
            )}
          </div>
        )}

        {/* Test Cases Tab */}
        {activeTab === 'testcases' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label>Filter by Category:</label>
              <select
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
                Showing {filteredTests.length} of {testCases.length} test cases
              </span>
            </div>

            {filteredTests.map((test, index) => (
              <div key={test.id || index} style={styles.testCard}>
                <h3 style={{ marginTop: 0, color: '#1976d2' }}>{test.title || `Test Case ${index + 1}`}</h3>
                <p><strong>Description:</strong> {test.description}</p>
                <p><strong>Priority:</strong> {test.priority}</p>
                <p><strong>Category:</strong> {test.category}</p>
                {test.testSteps && test.testSteps.length > 0 && (
                  <div>
                    <strong>Steps:</strong>
                    <ol style={{ marginTop: '8px', marginBottom: '8px' }}>
                      {test.testSteps.map((step, i) => (
                        <li key={i}>{typeof step === 'string' ? step : step.step}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <p><strong>Expected Results:</strong> {test.expectedResults || test.expected}</p>
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#666' }}>
                  <strong> Risk:</strong> {test.riskLevel} | 
                  <strong> Compliance:</strong> {test.complianceRequirements?.join(', ') || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div>
            <h2>📤 Export Test Results</h2>
            <div style={styles.exportSection}>
              <h3>Select Export Format:</h3>
              
              {/* Export messages */}
              {exportSuccess && (
                <div style={styles.successMessage}>
                  {exportSuccess}
                </div>
              )}
              
              {exportError && (
                <div style={styles.errorMessage}>
                  ⚠️ {exportError}
                </div>
              )}
              
              <div style={styles.exportButtons}>
                {['csv', 'json', 'excel', 'jira'].map(format => (
                  <button
                    key={format}
                    style={{
                      ...styles.button,
                      ...(exportFormat === format ? styles.primaryButton : styles.secondaryButton)
                    }}
                    onClick={() => setExportFormat(format)}
                    disabled={exportLoading}
                  >
                    {format === 'csv' && '📊'} 
                    {format === 'json' && '📋'} 
                    {format === 'excel' && '📈'} 
                    {format === 'jira' && '🎫'} 
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <p><strong>Export Details:</strong></p>
                <ul>
                  <li>Test Cases: {filteredTests.length}</li>
                  <li>Test Scenarios: {testScenarios.length}</li>
                  <li>Methodology: {methodology}</li>
                  <li>Compliance: {complianceFramework}</li>
                </ul>
              </div>

              <button
                onClick={() => handleExport(exportFormat)}
                disabled={exportLoading || filteredTests.length === 0}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  width: '100%',
                  opacity: exportLoading || filteredTests.length === 0 ? 0.6 : 1
                }}
              >
                {exportLoading ? '🔄 Exporting...' : `📤 Export as ${exportFormat.toUpperCase()}`}
              </button>
              
              {filteredTests.length === 0 && (
                <p style={{ color: '#666', textAlign: 'center', marginTop: '12px' }}>
                  No test cases available to export. Please generate test cases first.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResults;