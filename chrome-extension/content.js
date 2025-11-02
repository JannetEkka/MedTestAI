// chrome-extension/content.js
console.log('🔍 MedTestAI extension loaded');

// Keywords that indicate a requirements document or PRD
const REQUIREMENT_KEYWORDS = [
  'requirements document',
  'product requirements',
  'PRD',
  'functional requirements',
  'user requirements',
  'system requirements',
  'acceptance criteria',
  'use case',
  'user story',
  'feature specification',
  'technical specification',
  'software requirements specification',
  'SRS'
];

// Healthcare-specific keywords
const HEALTHCARE_KEYWORDS = [
  'HIPAA',
  'HL7',
  'FHIR',
  'PHI',
  'EMR',
  'EHR',
  'patient',
  'clinical',
  'healthcare',
  'medical',
  'FDA',
  '21 CFR',
  'ICD-10',
  'CPT'
];

/**
 * Detect if current page contains a requirements document
 */
function detectRequirementsDocument() {
  const pageText = document.body.innerText.toLowerCase();
  const pageTitle = document.title.toLowerCase();
  
  // Check for requirement keywords
  const hasRequirementKeywords = REQUIREMENT_KEYWORDS.some(keyword => 
    pageText.includes(keyword.toLowerCase()) || pageTitle.includes(keyword.toLowerCase())
  );
  
  // Check for healthcare keywords
  const hasHealthcareKeywords = HEALTHCARE_KEYWORDS.some(keyword =>
    pageText.includes(keyword.toLowerCase())
  );
  
  // More confident if both types of keywords are present
  const confidence = (hasRequirementKeywords && hasHealthcareKeywords) ? 'high' 
    : hasRequirementKeywords ? 'medium' 
    : 'low';
  
  return {
    isRequirementsDoc: hasRequirementKeywords,
    isHealthcare: hasHealthcareKeywords,
    confidence,
    url: window.location.href,
    title: document.title
  };
}

/**
 * Extract text content from the page
 */
function extractContent() {
  // Try to find main content area
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.document-content',
    '.page-content',
    '#content',
    '.content'
  ];
  
  let content = '';
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.innerText;
      break;
    }
  }
  
  // Fallback to body
  if (!content) {
    content = document.body.innerText;
  }
  
  return content;
}

/**
 * Extract structured requirements
 */
function extractRequirements(content) {
  const requirements = [];
  const lines = content.split('\n');
  
  // Patterns that indicate requirements
  const patterns = [
    /^REQ[-_]?\d+/i,
    /^The system (shall|must|should)/i,
    /^User (shall|must|should)/i,
    /^As a .* I want/i,
    /^Given .* When .* Then/i
  ];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length < 10) return;
    
    const isRequirement = patterns.some(pattern => pattern.test(trimmed));
    
    if (isRequirement) {
      requirements.push({
        id: `REQ-${requirements.length + 1}`,
        text: trimmed,
        lineNumber: index + 1
      });
    }
  });
  
  return requirements;
}

/**
 * Send data to MedTestAI backend
 */
async function sendToMedTestAI(data) {
  try {
    // Get API endpoint from storage
    const config = await chrome.storage.sync.get(['apiEndpoint', 'apiKey']);
    const apiEndpoint = config.apiEndpoint || 'https://medtestai-backend-1067292712875.us-central1.run.app';
    
    const response = await fetch(`${apiEndpoint}/api/webhooks/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey || ''
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Failed to send to MedTestAI:', error);
    throw error;
  }
}

/**
 * Show notification to user
 */
function showNotification(detected) {
  // Create floating notification
  const notification = document.createElement('div');
  notification.id = 'medtestai-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 350px;
    ">
      <div style="font-weight: 600; margin-bottom: 8px;">
        🔍 Requirements Document Detected
      </div>
      <div style="font-size: 13px; opacity: 0.9; margin-bottom: 12px;">
        Confidence: ${detected.confidence.toUpperCase()}
        ${detected.isHealthcare ? ' | Healthcare Document' : ''}
      </div>
      <button id="medtestai-generate-btn" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        margin-right: 8px;
      ">
        Generate Tests
      </button>
      <button id="medtestai-dismiss-btn" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">
        Dismiss
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Add event listeners
  document.getElementById('medtestai-generate-btn').addEventListener('click', async () => {
    notification.remove();
    await handleGenerateTests();
  });
  
  document.getElementById('medtestai-dismiss-btn').addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (document.getElementById('medtestai-notification')) {
      notification.remove();
    }
  }, 30000);
}

/**
 * Handle test generation
 */
async function handleGenerateTests() {
  // Show loading indicator
  const loading = document.createElement('div');
  loading.id = 'medtestai-loading';
  loading.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 999999;
      text-align: center;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">⚙️</div>
      <div style="font-weight: 600; margin-bottom: 8px;">Generating Test Cases</div>
      <div style="color: #666;">This may take a moment...</div>
    </div>
  `;
  document.body.appendChild(loading);
  
  try {
    const content = extractContent();
    const requirements = extractRequirements(content);
    
    const data = {
      source: 'chrome-extension',
      url: window.location.href,
      title: document.title,
      content: content.substring(0, 10000), // Limit size
      requirements,
      detectedAt: new Date().toISOString()
    };
    
    const result = await sendToMedTestAI(data);
    
    loading.remove();
    
    // Show success message
    const success = document.createElement('div');
    success.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 32px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 999999;
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <div style="font-weight: 600; margin-bottom: 8px;">Test Cases Generated!</div>
        <div style="color: #666; margin-bottom: 16px;">
          ${result.testCases?.length || 0} test cases created
        </div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #667eea;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        ">
          Done
        </button>
      </div>
    `;
    document.body.appendChild(success);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => success.remove(), 5000);
    
  } catch (error) {
    loading.remove();
    
    // Show error message
    const errorMsg = document.createElement('div');
    errorMsg.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 16px;
        border-radius: 8px;
        z-index: 999999;
      ">
        ❌ Generation failed: ${error.message}
      </div>
    `;
    document.body.appendChild(errorMsg);
    setTimeout(() => errorMsg.remove(), 5000);
  }
}

// Run detection when page loads
window.addEventListener('load', () => {
  const detected = detectRequirementsDocument();
  
  if (detected.isRequirementsDoc && detected.confidence !== 'low') {
    console.log('📋 Requirements document detected:', detected);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'REQUIREMENTS_DETECTED',
      data: detected
    });
    
    // Show notification to user
    showNotification(detected);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GENERATE_TESTS') {
    handleGenerateTests().then(
      () => sendResponse({ success: true }),
      (error) => sendResponse({ success: false, error: error.message })
    );
    return true; // Keep message channel open
  }
});