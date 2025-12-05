// Configuration Template
// This is a template file. The actual config.js with production webhooks
// is git-ignored for security purposes.

const CONFIG = {
  WEBHOOKS: {
    approve: 'https://your-n8n-instance.com/webhook/report-got-approved',
    adjust: 'https://your-n8n-instance.com/webhook/new-feedback',
    rules: 'https://your-n8n-instance.com/webhook/new-rules'
  }
};
