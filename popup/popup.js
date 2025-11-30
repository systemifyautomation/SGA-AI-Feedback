// SGA AI Feedback - Popup Script

// DOM Elements
const notGoogleDocsMessage = document.getElementById('not-google-docs');
const mainContent = document.getElementById('main-content');
const selectedTextContainer = document.getElementById('selected-text-container');
const selectedTextElement = document.getElementById('selected-text');
const feedbackForm = document.getElementById('feedback-form');
const relativeFields = document.getElementById('relative-fields');
const absoluteFields = document.getElementById('absolute-fields');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Buttons
const btnRelative = document.getElementById('btn-relative');
const btnAbsolute = document.getElementById('btn-absolute');
const btnCancel = document.getElementById('btn-cancel');
const btnSubmit = document.getElementById('btn-submit');
const ratingButtons = document.querySelectorAll('.rating-btn');

// Form inputs
const expectedOutput = document.getElementById('expected-output');
const relativeComment = document.getElementById('relative-comment');
const absoluteComment = document.getElementById('absolute-comment');

// State
let currentFeedbackType = null;
let currentRating = null;
let selectedText = '';
let isGoogleDocs = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkIfGoogleDocs();
  await getSelectedText();
  setupEventListeners();
});

// Check if current tab is Google Docs
async function checkIfGoogleDocs() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Use URL parsing to properly validate the hostname
    let url;
    try {
      url = new URL(tab.url);
    } catch {
      isGoogleDocs = false;
    }
    isGoogleDocs = url && url.hostname === 'docs.google.com';
    
    if (!isGoogleDocs) {
      notGoogleDocsMessage.classList.remove('hidden');
      mainContent.style.opacity = '0.5';
      mainContent.style.pointerEvents = 'none';
    }
  } catch (error) {
    console.error('Error checking tab:', error);
  }
}

// Get selected text from the content script
async function getSelectedText() {
  if (!isGoogleDocs) return;
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
    
    if (response && response.selectedText) {
      selectedText = response.selectedText;
      selectedTextElement.textContent = selectedText;
      selectedTextContainer.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error getting selected text:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Feedback type buttons
  btnRelative.addEventListener('click', () => selectFeedbackType('relative'));
  btnAbsolute.addEventListener('click', () => selectFeedbackType('absolute'));
  
  // Rating buttons
  ratingButtons.forEach(btn => {
    btn.addEventListener('click', () => selectRating(parseInt(btn.dataset.rating)));
  });
  
  // Form action buttons
  btnCancel.addEventListener('click', resetForm);
  btnSubmit.addEventListener('click', submitFeedback);
}

// Select feedback type
function selectFeedbackType(type) {
  currentFeedbackType = type;
  
  // Update button states
  btnRelative.classList.toggle('active', type === 'relative');
  btnAbsolute.classList.toggle('active', type === 'absolute');
  
  // Show form
  feedbackForm.classList.remove('hidden');
  
  // Show appropriate fields
  relativeFields.classList.toggle('hidden', type !== 'relative');
  absoluteFields.classList.toggle('hidden', type !== 'absolute');
  
  // Hide messages
  successMessage.classList.add('hidden');
  errorMessage.classList.add('hidden');
}

// Select rating
function selectRating(rating) {
  currentRating = rating;
  
  ratingButtons.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.rating) <= rating);
  });
}

// Reset form
function resetForm() {
  currentFeedbackType = null;
  currentRating = null;
  
  // Reset buttons
  btnRelative.classList.remove('active');
  btnAbsolute.classList.remove('active');
  ratingButtons.forEach(btn => btn.classList.remove('active'));
  
  // Hide form
  feedbackForm.classList.add('hidden');
  
  // Clear inputs
  expectedOutput.value = '';
  relativeComment.value = '';
  absoluteComment.value = '';
  
  // Hide messages
  successMessage.classList.add('hidden');
  errorMessage.classList.add('hidden');
}

// Submit feedback
async function submitFeedback() {
  // Validate
  if (!currentFeedbackType) {
    showError('Please select a feedback type');
    return;
  }
  
  let comment = '';
  let feedbackData = {
    type: currentFeedbackType,
    selectedText: selectedText,
    timestamp: new Date().toISOString(),
    pageUrl: ''
  };
  
  if (currentFeedbackType === 'relative') {
    const expected = expectedOutput.value.trim();
    comment = relativeComment.value.trim();
    
    if (!expected) {
      showError('Please provide your expected output');
      return;
    }
    
    feedbackData.expectedOutput = expected;
    feedbackData.comment = comment;
  } else {
    comment = absoluteComment.value.trim();
    
    if (!currentRating) {
      showError('Please select a rating');
      return;
    }
    
    feedbackData.rating = currentRating;
    feedbackData.comment = comment;
  }
  
  // Get current page URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    feedbackData.pageUrl = tab.url;
  } catch (error) {
    console.error('Error getting page URL:', error);
  }
  
  // Show loading state
  btnSubmit.classList.add('loading');
  btnSubmit.disabled = true;
  
  try {
    // Send to background script for webhook call
    const response = await chrome.runtime.sendMessage({
      action: 'submitFeedback',
      data: feedbackData
    });
    
    if (response.success) {
      showSuccess();
      setTimeout(() => {
        resetForm();
      }, 2000);
    } else {
      showError(response.error || 'Failed to submit feedback');
    }
  } catch (error) {
    console.error('Error submitting feedback:', error);
    showError('Failed to submit feedback. Please try again.');
  } finally {
    btnSubmit.classList.remove('loading');
    btnSubmit.disabled = false;
  }
}

// Show success message
function showSuccess() {
  successMessage.classList.remove('hidden');
  errorMessage.classList.add('hidden');
}

// Show error message
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  successMessage.classList.add('hidden');
}
