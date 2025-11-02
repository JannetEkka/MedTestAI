// chrome-extension/background.js
console.log('🚀 MedTestAI background service worker started');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REQUIREMENTS_DETECTED') {
    console.log('📋 Requirements detected:', request.data);
    
    // Show browser notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Requirements Document Detected',
      message: `Found in ${request.data.title}`,
      priority: 2
    });
    
    // Store detection in chrome.storage
    chrome.storage.local.get(['detections'], (result) => {
      const detections = result.detections || [];
      detections.push({
        ...request.data,
        timestamp: Date.now()
      });
      
      // Keep only last 50 detections
      if (detections.length > 50) {
        detections.shift();
      }
      
      chrome.storage.local.set({ detections });
    });
  }
});

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Send message to content script to generate tests
  chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_TESTS' });
});

// Context menu for manual triggering
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'medtestai-generate',
    title: 'Generate Test Cases with MedTestAI',
    contexts: ['page', 'selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'medtestai-generate') {
    chrome.tabs.sendMessage(tab.id, { 
      type: 'GENERATE_TESTS',
      selection: info.selectionText 
    });
  }
});

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('⏰ Keep-alive ping');
  }
});