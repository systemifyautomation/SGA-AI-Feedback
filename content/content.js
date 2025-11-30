// SGA AI Feedback - Content Script
// This script runs on Google Docs pages

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSelectedText') {
    const selectedText = getSelectedText();
    sendResponse({ selectedText: selectedText });
  }
  return true;
});

// Get selected text from the page
function getSelectedText() {
  // Try standard selection first
  const selection = window.getSelection();
  if (selection && selection.toString().trim()) {
    return selection.toString().trim();
  }
  
  // For Google Docs, the selection might be in an iframe
  // or rendered differently, so we try multiple approaches
  try {
    // Check for Google Docs specific elements
    const docsIframe = document.querySelector('.docs-texteventtarget-iframe');
    if (docsIframe && docsIframe.contentDocument) {
      const iframeSelection = docsIframe.contentDocument.getSelection();
      if (iframeSelection && iframeSelection.toString().trim()) {
        return iframeSelection.toString().trim();
      }
    }
    
    // Try getting text from the kix selection
    const kixSelection = document.querySelector('.kix-selection-overlay');
    if (kixSelection) {
      // Look for selected content in the document
      const selectedElements = document.querySelectorAll('.kix-lineview-content');
      let selectedText = '';
      
      selectedElements.forEach(el => {
        const text = el.textContent;
        if (text) {
          selectedText += text + ' ';
        }
      });
      
      if (selectedText.trim()) {
        return selectedText.trim();
      }
    }
  } catch (error) {
    console.error('Error getting Google Docs selection:', error);
  }
  
  return '';
}

// Create floating feedback button
function createFloatingButton() {
  // Check if button already exists
  if (document.getElementById('sga-feedback-btn')) {
    return;
  }
  
  const button = document.createElement('div');
  button.id = 'sga-feedback-btn';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 11.5C21 16.75 16.75 21 11.5 21C6.25 21 2 16.75 2 11.5C2 6.25 6.25 2 11.5 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M22 22L20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M15 8H19M17 6V10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <span>Give Feedback</span>
  `;
  button.title = 'Give AI Feedback';
  
  button.addEventListener('click', () => {
    // Open the extension popup or show inline feedback
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
  
  document.body.appendChild(button);
}

// Show context button near selection
function showContextButton(x, y, selectedText) {
  // Remove existing context button
  removeContextButton();
  
  if (!selectedText) return;
  
  const contextBtn = document.createElement('div');
  contextBtn.id = 'sga-context-btn';
  contextBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15V17M12 11V13M12 7V9M12 3V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
    </svg>
    <span>Add Feedback</span>
  `;
  
  contextBtn.style.left = `${x}px`;
  contextBtn.style.top = `${y}px`;
  
  contextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Store the selected text and notify the extension
    chrome.storage.local.set({ selectedText: selectedText }, () => {
      chrome.runtime.sendMessage({ 
        action: 'showFeedbackPanel',
        selectedText: selectedText
      });
    });
    removeContextButton();
  });
  
  document.body.appendChild(contextBtn);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeContextButton();
  }, 5000);
}

// Remove context button
function removeContextButton() {
  const existingBtn = document.getElementById('sga-context-btn');
  if (existingBtn) {
    existingBtn.remove();
  }
}

// Listen for text selection
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selectedText = getSelectedText();
    if (selectedText && selectedText.length > 0) {
      showContextButton(e.pageX, e.pageY - 40, selectedText);
    } else {
      removeContextButton();
    }
  }, 100);
});

// Remove context button on click elsewhere
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('#sga-context-btn')) {
    removeContextButton();
  }
});

// Initialize
createFloatingButton();

console.log('SGA AI Feedback extension loaded');
