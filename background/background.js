// SGA AI Feedback - Background Service Worker

// Default webhook URL - can be configured in extension storage
const DEFAULT_WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/sga-ai-feedback';

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'submitFeedback') {
    handleSubmitFeedback(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'openPopup') {
    // Chrome doesn't support programmatically opening popups
    // User needs to click the extension icon
    console.log('User should click the extension icon to open feedback');
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'showFeedbackPanel') {
    // Store selected text for the popup to access
    chrome.storage.local.set({ 
      selectedText: request.selectedText,
      timestamp: Date.now()
    });
    sendResponse({ success: true });
    return true;
  }
});

// Handle feedback submission to n8n webhook
async function handleSubmitFeedback(data) {
  try {
    // Get the webhook URL from storage or use default
    const storage = await chrome.storage.sync.get(['webhookUrl']);
    const webhookUrl = storage.webhookUrl || DEFAULT_WEBHOOK_URL;
    
    // Prepare the payload
    const payload = {
      feedbackType: data.type,
      selectedText: data.selectedText || '',
      pageUrl: data.pageUrl || '',
      timestamp: data.timestamp || new Date().toISOString(),
      ...formatFeedbackData(data)
    };
    
    console.log('Submitting feedback:', payload);
    
    // Send to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    }
    
    // Log success
    console.log('Feedback submitted successfully');
    
    // Store in local history
    await storeFeedbackHistory(payload);
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return { success: false, error: error.message };
  }
}

// Format feedback data based on type
function formatFeedbackData(data) {
  if (data.type === 'relative') {
    return {
      expectedOutput: data.expectedOutput || '',
      comment: data.comment || ''
    };
  } else if (data.type === 'absolute') {
    return {
      rating: data.rating || 0,
      comment: data.comment || ''
    };
  }
  return {};
}

// Store feedback in local history
async function storeFeedbackHistory(feedback) {
  try {
    const result = await chrome.storage.local.get(['feedbackHistory']);
    const history = result.feedbackHistory || [];
    
    // Add new feedback to the beginning
    history.unshift({
      ...feedback,
      id: generateId(),
      submittedAt: new Date().toISOString()
    });
    
    // Keep only last 50 items
    if (history.length > 50) {
      history.pop();
    }
    
    await chrome.storage.local.set({ feedbackHistory: history });
  } catch (error) {
    console.error('Error storing feedback history:', error);
  }
}

// Generate a simple unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('SGA AI Feedback extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
      webhookUrl: DEFAULT_WEBHOOK_URL,
      showFloatingButton: true
    });
  } else if (details.reason === 'update') {
    console.log('SGA AI Feedback extension updated to version', chrome.runtime.getManifest().version);
  }
});

console.log('SGA AI Feedback background service worker loaded');
