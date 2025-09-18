import React from 'react';

const TestResults = ({ results, methodology }) => {
  return (
    <div className="test-results">
      <h2>✅ Generated Test Cases ({methodology.toUpperCase()})</h2>
      
      <div className="results-header">
        <span className="methodology-badge">{methodology}</span>
        <button className="export-btn">📤 Export to JIRA</button>
      </div>

      <div className="test-cases">
        {results.testCases.map(test => (
          <div key={test.id} className="test-case">
            <h3>{test.id}: {test.title}</h3>
            <span className="test-type">{test.type}</span>
            {methodology === 'agile' && (
              <div className="acceptance-criteria">
                <h4>Acceptance Criteria:</h4>
                <ul>
                  <li>Given I am a healthcare professional</li>
                  <li>When I attempt to access patient records</li>
                  <li>Then I should be authenticated securely</li>
                </ul>
              </div>
            )}
            {methodology === 'waterfall' && (
              <div className="test-steps">
                <h4>Test Steps:</h4>
                <ol>
                  <li>Navigate to patient records system</li>
                  <li>Attempt unauthorized access</li>
                  <li>Verify access is denied</li>
                  <li>Verify audit log entry created</li>
                </ol>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestResults;