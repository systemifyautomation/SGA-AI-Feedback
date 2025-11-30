# SGA AI Feedback Chrome Extension

A Chrome extension for SGA Consulting to provide feedback to their AI assistant. The extension allows users to give two types of feedback (relative and absolute) when working in Google Docs.

## Features

- **Two Feedback Types:**
  - **Relative Feedback:** Compare AI output with expected results
  - **Absolute Feedback:** Rate AI output on a 1-5 scale

- **Text Selection:** Select any text in Google Docs and add comments

- **n8n Webhook Integration:** All feedback is sent to an n8n webhook for processing

- **Beautiful UI/UX:** Clean, modern interface with smooth animations

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The SGA AI Feedback icon will appear in your browser toolbar

## Configuration

Update the webhook URL in `background/background.js`:

```javascript
const WEBHOOK_URL = 'https://your-n8n-instance.com/webhook/sga-ai-feedback';
```

## Usage

1. Open a Google Doc
2. Select the AI-generated text you want to provide feedback on
3. Click the floating "Give Feedback" button or use the extension popup
4. Choose your feedback type:
   - **Relative:** Provide expected output and explain the difference
   - **Absolute:** Rate the quality (1-5) and add comments
5. Submit your feedback

## Webhook Payload

The extension sends the following data to your n8n webhook:

```json
{
  "feedbackType": "relative" | "absolute",
  "selectedText": "The selected text from the document",
  "pageUrl": "URL of the Google Doc",
  "timestamp": "ISO timestamp",
  "expectedOutput": "Expected text (for relative feedback)",
  "rating": 1-5 (for absolute feedback),
  "comment": "User's comment"
}
```

## Project Structure

```
SGA-AI-Feedback/
├── manifest.json          # Extension manifest
├── background/
│   └── background.js      # Service worker for webhook calls
├── content/
│   ├── content.js         # Content script for Google Docs
│   └── content.css        # Styles for in-page UI elements
├── popup/
│   ├── popup.html         # Extension popup interface
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
└── icons/
    ├── icon16.png         # 16x16 icon
    ├── icon48.png         # 48x48 icon
    └── icon128.png        # 128x128 icon
```

## Development

This is a Manifest V3 Chrome extension. To make changes:

1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes on a Google Doc

## License

© SGA Consulting 2024
