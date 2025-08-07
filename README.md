# AI Browser Copilot Chrome Extension

A Chrome extension that extracts comprehensive information from any webpage and processes it using Google Gemini API to generate formatted output files.

## Features

- **Comprehensive Data Extraction**: Extracts text, images, links, metadata, and HTML structure from any webpage
- **AI Processing**: Uses Google Gemini API to analyze and format extracted data
- **Multiple Output Formats**: Supports CSV, TXT, JSON, and link list formats
- **Custom Prompts**: Configurable system and user prompts for specific extraction needs
- **Secure Storage**: API keys stored locally in browser storage
- **Auto Download**: Processed data automatically downloads as files

## Setup Instructions

### 1. Get Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key for Gemini
3. Copy the API key (you'll need it in the extension)

### 2. Install the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `AI-Browser-Copilot` folder
5. The extension should now appear in your extensions list

### 3. Add Extension Icons (Optional)
Create or add these icon files in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels) 
- `icon128.png` (128x128 pixels)

## Usage

1. **Navigate** to any webpage you want to extract data from
2. **Click** the AI Browser Copilot extension icon
3. **Enter** your Gemini API key (first time only)
4. **Configure** your prompts:
   - System Prompt: Instructions for the AI on how to process data
   - User Prompt: Specific extraction request
5. **Select** output format (CSV, Text, JSON, or Links)
6. **Click** "Extract & Process"
7. **Wait** for processing to complete
8. **Check** your Downloads folder for the generated file

## Example Prompts

### CSV Format
- **User Prompt**: "Extract all product names, prices, and descriptions from this e-commerce page"
- **Output**: CSV file with columns for products

### Text Format  
- **User Prompt**: "Summarize the main article content in 3-4 paragraphs"
- **Output**: Clean text summary

### JSON Format
- **User Prompt**: "Extract all company information including name, description, contact details, and services"
- **Output**: Structured JSON data

### Links Format
- **User Prompt**: "Find all external links and categorize them by domain"
- **Output**: Organized list of links

## File Structure

```
AI-Browser-Copilot/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and UI handlers
├── content.js             # Page data extraction script
├── background.js          # Gemini API integration and file downloads
├── icons/                 # Extension icons (16px, 48px, 128px)
└── README.md             # This file
```

## Permissions Explained

- `activeTab`: Access current tab for data extraction
- `scripting`: Inject content scripts into webpages  
- `storage`: Save API keys and settings locally
- `downloads`: Save processed files to Downloads folder
- `host_permissions`: Access all websites for data extraction

## Privacy & Security

- API keys are stored locally in Chrome storage
- No data is sent to external servers except Google Gemini API
- All processing happens locally in your browser
- Extension only accesses the active tab when you click extract

## Troubleshooting

### "Failed to extract page data"
- Make sure you're on a fully loaded webpage
- Try refreshing the page and waiting for it to load completely

### "Gemini API error"
- Verify your API key is correct
- Check your Gemini API quota and billing
- Ensure you have access to the Gemini Pro model

### Extension not appearing
- Enable Developer mode in chrome://extensions/
- Try reloading the extension
- Check browser console for error messages

## Development

To modify or extend the extension:

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the AI Browser Copilot extension
4. Test your changes

## License

This project is open source and available under the MIT License.