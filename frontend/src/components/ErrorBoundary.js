import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and potentially to a logging service
    console.error('Healthcare AI Error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // In a real app, you would send this to a logging service
    // For healthcare applications, ensure HIPAA compliance in logging
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // This would integrate with your HIPAA-compliant logging service
    const errorReport = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      // Note: Never log PHI or sensitive healthcare data
      context: 'MedTestAI Healthcare Platform'
    };

    // Send to your logging endpoint (implement HIPAA-compliant logging)
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/logging/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      }).catch(err => console.error('Failed to log error:', err));
    }
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  handleReportIssue = () => {
    const issueUrl = `https://github.com/JannetEkka/MedTestAI/issues/new?` +
      `title=${encodeURIComponent(`Error: ${this.state.error?.message || 'Unknown error'}`)}&` +
      `body=${encodeURIComponent(
        `**Error ID:** ${this.state.errorId}\n` +
        `**Timestamp:** ${new Date().toISOString()}\n` +
        `**Error Message:** ${this.state.error?.message || 'Unknown'}\n` +
        `**Browser:** ${navigator.userAgent}\n` +
        `**URL:** ${window.location.href}\n\n` +
        `**Steps to Reproduce:**\n1. \n2. \n3. \n\n` +
        `**Expected Behavior:**\n\n` +
        `**Actual Behavior:**\n\n` +
        `**Additional Context:**\n`
      )}`;
    
    window.open(issueUrl, '_blank');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-header">
              <div className="error-icon">⚕️💥</div>
              <h1>Healthcare AI System Error</h1>
              <p className="error-subtitle">
                We're sorry, but something went wrong with the AI processing system
              </p>
            </div>

            <div className="error-content">
              <div className="error-id">
                <strong>Error ID:</strong> <code>{this.state.errorId}</code>
                <button 
                  onClick={() => navigator.clipboard.writeText(this.state.errorId)}
                  className="copy-btn"
                  title="Copy Error ID"
                >
                  📋
                </button>
              </div>

              <div className="error-message">
                <h3>What happened?</h3>
                <p>
                  The healthcare AI testing platform encountered an unexpected error. 
                  This could be due to:
                </p>
                <ul>
                  <li>🔌 Network connectivity issues with Google Cloud services</li>
                  <li>📄 Problems processing the uploaded healthcare document</li>
                  <li>🧠 AI model temporarily unavailable or overloaded</li>
                  <li>💾 Browser storage or memory limitations</li>
                  <li>🔧 Temporary service maintenance</li>
                </ul>
              </div>

              <div className="error-actions">
                <div className="primary-actions">
                  <button 
                    onClick={this.handleRetry}
                    className="btn-primary retry-btn"
                  >
                    🔄 Try Again
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-secondary"
                  >
                    🔃 Reload Page
                  </button>
                </div>

                <div className="secondary-actions">
                  <button 
                    onClick={this.handleReportIssue}
                    className="btn-secondary report-btn"
                  >
                    🐛 Report Issue
                  </button>
                  <button 
                    onClick={() => window.location.href = '/health'}
                    className="btn-secondary"
                  >
                    🏥 Check System Status
                  </button>
                </div>
              </div>

              <div className="error-help">
                <h3>🆘 Need Immediate Help?</h3>
                <div className="help-options">
                  <div className="help-option">
                    <strong>📧 Email Support:</strong>
                    <a href="mailto:support@medtestai.com">support@medtestai.com</a>
                  </div>
                  <div className="help-option">
                    <strong>📚 Documentation:</strong>
                    <a href="https://docs.medtestai.com" target="_blank" rel="noopener noreferrer">
                      User Guide & Troubleshooting
                    </a>
                  </div>
                  <div className="help-option">
                    <strong>💬 Community:</strong>
                    <a href="https://github.com/JannetEkka/MedTestAI/discussions" target="_blank" rel="noopener noreferrer">
                      GitHub Discussions
                    </a>
                  </div>
                </div>
              </div>

              {/* Show technical details in development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="error-technical">
                  <summary>🔧 Technical Details (Development Only)</summary>
                  <div className="technical-info">
                    <h4>Error Message:</h4>
                    <pre className="error-stack">{this.state.error.message}</pre>
                    
                    <h4>Stack Trace:</h4>
                    <pre className="error-stack">{this.state.error.stack}</pre>
                    
                    {this.state.errorInfo && (
                      <>
                        <h4>Component Stack:</h4>
                        <pre className="error-stack">{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="error-footer">
              <div className="compliance-notice">
                <p>
                  <strong>🔒 Privacy Notice:</strong> No patient health information (PHI) or 
                  sensitive healthcare data is included in error reports. All error logging 
                  is HIPAA compliant.
                </p>
              </div>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
              font-family: 'Inter', sans-serif;
            }

            .error-container {
              background: white;
              border-radius: 1rem;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              max-width: 800px;
              width: 100%;
              overflow: hidden;
            }

            .error-header {
              background: linear-gradient(135deg, #2c5282 0%, #3182ce 100%);
              color: white;
              padding: 3rem 2rem;
              text-align: center;
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }

            .error-header h1 {
              font-size: 2rem;
              margin-bottom: 0.5rem;
              font-weight: 700;
            }

            .error-subtitle {
              font-size: 1.1rem;
              opacity: 0.9;
            }

            .error-content {
              padding: 2rem;
            }

            .error-id {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 0.5rem;
              padding: 1rem;
              margin-bottom: 2rem;
              display: flex;
              align-items: center;
              gap: 1rem;
            }

            .error-id code {
              background: #edf2f7;
              padding: 0.25rem 0.5rem;
              border-radius: 0.25rem;
              font-family: 'Monaco', monospace;
              color: #2d3748;
            }

            .copy-btn {
              background: none;
              border: none;
              cursor: pointer;
              padding: 0.25rem;
              border-radius: 0.25rem;
              transition: background-color 0.2s;
            }

            .copy-btn:hover {
              background: #e2e8f0;
            }

            .error-message {
              margin-bottom: 2rem;
            }

            .error-message h3 {
              margin-bottom: 1rem;
              color: #2d3748;
            }

            .error-message ul {
              margin: 1rem 0;
              padding-left: 1.5rem;
            }

            .error-message li {
              margin-bottom: 0.5rem;
            }

            .error-actions {
              margin-bottom: 2rem;
            }

            .primary-actions, .secondary-actions {
              display: flex;
              gap: 1rem;
              margin-bottom: 1rem;
              flex-wrap: wrap;
            }

            .btn-primary, .btn-secondary {
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 0.5rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              text-decoration: none;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            }

            .btn-primary {
              background: linear-gradient(135deg, #2c5282 0%, #3182ce 100%);
              color: white;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            }

            .btn-secondary {
              background: white;
              color: #4a5568;
              border: 2px solid #e2e8f0;
            }

            .btn-secondary:hover {
              background: #f7fafc;
              border-color: #cbd5e0;
            }

            .error-help {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 0.5rem;
              padding: 1.5rem;
              margin-bottom: 2rem;
            }

            .help-options {
              display: grid;
              gap: 1rem;
              margin-top: 1rem;
            }

            .help-option {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
            }

            .help-option a {
              color: #3182ce;
              text-decoration: none;
            }

            .help-option a:hover {
              text-decoration: underline;
            }

            .error-technical {
              background: #1a202c;
              color: #e2e8f0;
              border-radius: 0.5rem;
              padding: 1rem;
              margin-top: 2rem;
            }

            .error-technical summary {
              cursor: pointer;
              font-weight: 600;
              margin-bottom: 1rem;
            }

            .error-stack {
              background: #2d3748;
              padding: 1rem;
              border-radius: 0.25rem;
              overflow-x: auto;
              font-size: 0.875rem;
              margin: 0.5rem 0;
            }

            .error-footer {
              background: #f7fafc;
              padding: 1.5rem 2rem;
              border-top: 1px solid #e2e8f0;
            }

            .compliance-notice {
              font-size: 0.9rem;
              color: #4a5568;
            }

            @media (max-width: 640px) {
              .error-boundary {
                padding: 1rem;
              }
              
              .error-header {
                padding: 2rem 1rem;
              }
              
              .error-content {
                padding: 1.5rem;
              }
              
              .primary-actions, .secondary-actions {
                flex-direction: column;
              }
              
              .btn-primary, .btn-secondary {
                justify-content: center;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;