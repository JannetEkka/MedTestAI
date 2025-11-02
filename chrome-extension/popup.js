// chrome-extension/popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const generateBtn = document.getElementById('generateBtn');
  const configBtn = document.getElementById('configBtn');
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const cancelConfigBtn = document.getElementById('cancelConfigBtn');
  const statusSection = document.getElementById('statusSection');
  const configSection = document.getElementById('configSection');
  const message = document.getElementById('message');
  const connectionStatus = document.getElementById('connectionStatus');
  const detectionsCount = document.getElementById('detectionsCount');

  // Load configuration
  const config = await chrome.storage.sync.get(['apiEndpoint', 'apiKey']);
  document.getElementById('apiEndpoint').value = config.apiEndpoint || 
    'https://medtestai-backend-1067292712875.us-central1.run.app';
  document.getElementById('apiKey').value = config.apiKey || '';

  // Check connection status
  checkConnection();
  
  // Update detections count
  updateDetectionsCount();

  // Generate tests button
  generateBtn.addEventListener('click', async () => {
    showMessage('Generating test cases...', 'success');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_TESTS' }, (response) => {
        if (chrome.runtime.lastError) {
          showMessage('Error: ' + chrome.runtime.lastError.message, 'error');
        } else if (response && response.success) {
          showMessage('✅ Test cases generated successfully!', 'success');
        } else {
          showMessage('Generation failed', 'error');
        }
      });
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    }
  });

  // Config button
  configBtn.addEventListener('click', () => {
    statusSection.style.display = 'none';
    configSection.style.display = 'block';
  });

  // Save config button
  saveConfigBtn.addEventListener('click', async () => {
    const apiEndpoint = document.getElementById('apiEndpoint').value;
    const apiKey = document.getElementById('apiKey').value;
    
    await chrome.storage.sync.set({ apiEndpoint, apiKey });
    
    showMessage('✅ Configuration saved!', 'success');
    statusSection.style.display = 'block';
    configSection.style.display = 'none';
    
    checkConnection();
  });

  // Cancel config button
  cancelConfigBtn.addEventListener('click', () => {
    statusSection.style.display = 'block';
    configSection.style.display = 'none';
  });

  // Helper functions
  async function checkConnection() {
    try {
      const config = await chrome.storage.sync.get(['apiEndpoint']);
      const apiEndpoint = config.apiEndpoint || 
        'https://medtestai-backend-1067292712875.us-central1.run.app';
      
      const response = await fetch(`${apiEndpoint}/health`);
      
      if (response.ok) {
        connectionStatus.innerHTML = '<span class="badge badge-success">Connected</span>';
      } else {
        connectionStatus.innerHTML = '<span class="badge badge-warning">Disconnected</span>';
      }
    } catch (error) {
      connectionStatus.innerHTML = '<span class="badge badge-warning">Error</span>';
    }
  }

  async function updateDetectionsCount() {
    const result = await chrome.storage.local.get(['detections']);
    const detections = result.detections || [];
    
    // Count detections from today
    const today = new Date().setHours(0, 0, 0, 0);
    const todayCount = detections.filter(d => {
      const detectionDate = new Date(d.timestamp).setHours(0, 0, 0, 0);
      return detectionDate === today;
    }).length;
    
    detectionsCount.textContent = todayCount;
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = type;
    
    setTimeout(() => {
      message.style.display = 'none';
    }, 5000);
  }
});