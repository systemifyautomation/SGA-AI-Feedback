document.addEventListener('DOMContentLoaded', function() {
  // Main menu buttons
  const approveBtn = document.getElementById('approveBtn');
  const adjustBtn = document.getElementById('adjustBtn');
  const rulesBtn = document.getElementById('rulesBtn');

  // Adjust view elements
  const adjustContext = document.getElementById('adjustContext');
  const adjustPrompt = document.getElementById('adjustPrompt');
  const adjustSubmitRecreateBtn = document.getElementById('adjustSubmitRecreateBtn');
  const adjustSubmitBtn = document.getElementById('adjustSubmitBtn');

  // Rules view elements
  const rulesContainer = document.getElementById('rulesContainer');
  const addRuleBtn = document.getElementById('addRuleBtn');
  const rulesSubmitBtn = document.getElementById('rulesSubmitBtn');

  const status = document.getElementById('status');

  let ruleCounter = 0;
  let currentGoogleDocUrl = null;

  // Initialize
  checkGoogleDocsStatus();
  loadAdjustData();
  loadRulesData();

  // Main menu handlers
  approveBtn.addEventListener('click', handleApprove);
  adjustBtn.addEventListener('click', () => showViewWithCheck('adjustView'));
  rulesBtn.addEventListener('click', () => showView('rulesView'));

  // Adjust view handlers
  adjustContext.addEventListener('input', saveAdjustData);
  adjustPrompt.addEventListener('input', saveAdjustData);
  adjustSubmitRecreateBtn.addEventListener('click', () => handleAdjustSubmit('submit_and_recreate'));
  adjustSubmitBtn.addEventListener('click', () => handleAdjustSubmit('submit'));

  // Rules view handlers
  addRuleBtn.addEventListener('click', () => addRuleInput());
  rulesSubmitBtn.addEventListener('click', handleRulesSubmit);

  // Back and cancel button handlers
  document.querySelectorAll('.back-btn, .btn-ghost').forEach(btn => {
    const viewTarget = btn.getAttribute('data-view');
    if (viewTarget) {
      btn.addEventListener('click', () => showView(viewTarget));
    }
  });

  // Check if on Google Docs
  async function checkGoogleDocsStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab.url);
      const isGoogleDocs = url.hostname === 'docs.google.com';
      
      if (isGoogleDocs) {
        currentGoogleDocUrl = tab.url;
        // Enable approve and adjust buttons
        approveBtn.disabled = false;
        adjustBtn.disabled = false;
      } else {
        // Disable buttons that require Google Docs
        approveBtn.disabled = true;
        adjustBtn.disabled = true;
        approveBtn.style.opacity = '0.5';
        adjustBtn.style.opacity = '0.5';
        approveBtn.style.cursor = 'not-allowed';
        adjustBtn.style.cursor = 'not-allowed';
        
        // Add click handlers to show alert when disabled
        approveBtn.addEventListener('click', showGoogleDocsRequiredAlert);
        adjustBtn.addEventListener('click', showGoogleDocsRequiredAlert);
      }
    } catch (error) {
      console.error('Error checking Google Docs status:', error);
    }
  }

  // Show alert when user clicks disabled button
  function showGoogleDocsRequiredAlert(e) {
    e.preventDefault();
    e.stopPropagation();
    showStatus('⚠ Please open a Google Docs document to use this feature', 'error');
  }

  // Show view with Google Docs check
  function showViewWithCheck(viewId) {
    if (!currentGoogleDocUrl) {
      showStatus('⚠ Please open a Google Doc to use this feature', 'error');
      return;
    }
    showView(viewId);
  }

  // Handle Approve Report
  async function handleApprove() {
    if (!currentGoogleDocUrl) {
      showStatus('⚠ Please open a Google Doc to approve the report', 'error');
      return;
    }

    approveBtn.disabled = true;
    const originalHTML = approveBtn.innerHTML;
    approveBtn.innerHTML = `
      <div class="card-icon approve">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="spin">
          <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div><h3 class="card-title">Approving...</h3></div>
    `;

    try {
      const response = await fetch(CONFIG.WEBHOOKS.approve, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleDocUrl: currentGoogleDocUrl })
      });

      if (response.ok) {
        showStatus('✓ Report approved successfully!', 'success');
        setTimeout(() => window.close(), 1500);
      } else {
        throw new Error('Failed to approve report');
      }
    } catch (error) {
      showStatus('✗ Failed to approve report', 'error');
      approveBtn.disabled = false;
      approveBtn.innerHTML = originalHTML;
    }
  }

  // Handle Adjust Report Submit
  async function handleAdjustSubmit(submissionType) {
    const context = adjustContext.value.trim();
    const prompt = adjustPrompt.value.trim();

    if (!prompt) {
      showStatus('⚠ Please enter adjustment instructions', 'error');
      return;
    }

    if (!currentGoogleDocUrl) {
      showStatus('⚠ Please open a Google Doc', 'error');
      return;
    }

    adjustSubmitRecreateBtn.disabled = true;
    adjustSubmitBtn.disabled = true;

    const clickedButton = submissionType === 'submit_and_recreate' ? adjustSubmitRecreateBtn : adjustSubmitBtn;
    const originalHTML = clickedButton.innerHTML;
    clickedButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="spin">
        <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Sending...
    `;

    try {
      const payload = {
        type: 'relative',
        selectedText: context,
        prompt: prompt,
        googleDocUrl: currentGoogleDocUrl,
        submissionType: submissionType,
        timestamp: new Date().toISOString()
      };

      const response = await chrome.runtime.sendMessage({
        action: 'sendFeedback',
        payload: payload
      });

      if (response && response.success) {
        showStatus('✓ Adjustments submitted successfully!', 'success');
        adjustContext.value = '';
        adjustPrompt.value = '';
        localStorage.removeItem('adjustData');
        setTimeout(() => {
          showView('mainMenu');
        }, 1500);
      } else {
        throw new Error(response?.error || 'Failed to submit');
      }
    } catch (error) {
      showStatus('✗ Failed to submit adjustments', 'error');
    } finally {
      adjustSubmitRecreateBtn.disabled = false;
      adjustSubmitBtn.disabled = false;
      clickedButton.innerHTML = originalHTML;
    }
  }

  // Handle Rules Submit
  async function handleRulesSubmit() {
    const rules = getRules();

    if (rules.length === 0) {
      showStatus('⚠ Please add at least one rule', 'error');
      return;
    }

    rulesSubmitBtn.disabled = true;
    const originalHTML = rulesSubmitBtn.innerHTML;
    rulesSubmitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="spin">
        <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Sending...
    `;

    try {
      const response = await fetch(CONFIG.WEBHOOKS.rules, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: rules })
      });

      if (response.ok) {
        showStatus('✓ Rules submitted successfully!', 'success');
        rulesContainer.innerHTML = '';
        ruleCounter = 0;
        addRuleInput('', false);
        localStorage.removeItem('rulesData');
        setTimeout(() => {
          showView('mainMenu');
        }, 1500);
      } else {
        throw new Error('Failed to submit rules');
      }
    } catch (error) {
      showStatus('✗ Failed to submit rules', 'error');
    } finally {
      rulesSubmitBtn.disabled = false;
      rulesSubmitBtn.innerHTML = originalHTML;
    }
  }

  // Add a rule input field
  function addRuleInput(value = '', focus = true) {
    const ruleId = ++ruleCounter;
    const ruleItem = document.createElement('div');
    ruleItem.className = 'rule-item';
    ruleItem.dataset.ruleId = ruleId;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rule-input';
    input.placeholder = `Rule ${getRuleCount() + 1}`;
    input.value = value;
    input.dataset.ruleId = ruleId;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-rule-btn';
    removeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    removeBtn.title = 'Remove rule';
    
    removeBtn.addEventListener('click', function() {
      ruleItem.style.animation = 'slideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      setTimeout(() => {
        ruleItem.remove();
        updateRulePlaceholders();
        saveRulesData();
      }, 200);
    });
    
    input.addEventListener('input', saveRulesData);
    
    ruleItem.appendChild(input);
    ruleItem.appendChild(removeBtn);
    rulesContainer.appendChild(ruleItem);
    
    if (focus) {
      input.focus();
    }
    
    updateRulePlaceholders();
    saveRulesData();
  }

  // Get current rule count
  function getRuleCount() {
    return rulesContainer.querySelectorAll('.rule-input').length;
  }

  // Update rule placeholders
  function updateRulePlaceholders() {
    const inputs = rulesContainer.querySelectorAll('.rule-input');
    inputs.forEach((input, index) => {
      input.placeholder = `Rule ${index + 1}`;
    });
  }

  // Get all rules as an array
  function getRules() {
    const inputs = rulesContainer.querySelectorAll('.rule-input');
    const rules = [];
    inputs.forEach(input => {
      const value = input.value.trim();
      if (value) {
        rules.push(value);
      }
    });
    return rules;
  }

  // Save adjust data
  function saveAdjustData() {
    const data = {
      context: adjustContext.value,
      prompt: adjustPrompt.value
    };
    localStorage.setItem('adjustData', JSON.stringify(data));
  }

  // Load adjust data
  function loadAdjustData() {
    const saved = localStorage.getItem('adjustData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.context) adjustContext.value = data.context;
        if (data.prompt) adjustPrompt.value = data.prompt;
      } catch (error) {
        console.error('Error loading adjust data:', error);
      }
    }
  }

  // Save rules data
  function saveRulesData() {
    const data = { rules: getRules() };
    localStorage.setItem('rulesData', JSON.stringify(data));
  }

  // Load rules data
  function loadRulesData() {
    const saved = localStorage.getItem('rulesData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.rules && Array.isArray(data.rules) && data.rules.length > 0) {
          data.rules.forEach(rule => {
            addRuleInput(rule, false);
          });
          return;
        }
      } catch (error) {
        console.error('Error loading rules data:', error);
      }
    }
    
    // Add one empty rule if none exist
    if (getRuleCount() === 0) {
      addRuleInput('', false);
    }
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }

  // Add CSS for spin animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spin {
      animation: spin 1s linear infinite;
    }
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(-20px);
      }
    }
  `;
  document.head.appendChild(style);
});

// Global function for view switching
function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');
}
