document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const systemPromptInput = document.getElementById('systemPrompt');
    const userPromptInput = document.getElementById('userPrompt');
    const extractBtn = document.getElementById('extractBtn');
    const statusDiv = document.getElementById('status');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    const result = await chrome.storage.local.get(['apiKey', 'systemPrompt', 'userPrompt']);
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    if (result.systemPrompt) systemPromptInput.value = result.systemPrompt;
    if (result.userPrompt) userPromptInput.value = result.userPrompt;

    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    function updateProgress(percentage, message) {
        progressContainer.style.display = 'block';
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = message;
    }

    function hideProgress() {
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
    }

    function validateApiKey(apiKey) {
        // Google API keys typically start with AIza and are 39 characters long
        if (!apiKey || apiKey.length < 20) {
            return { valid: false, message: 'API key appears to be too short. Please verify your Gemini API key.' };
        }
        if (apiKey.length > 100) {
            return { valid: false, message: 'API key appears to be too long. Please verify your Gemini API key.' };
        }
        if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
            return { valid: false, message: 'API key contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.' };
        }
        return { valid: true };
    }

    function validatePrompt(prompt, maxLength = 5000) {
        if (!prompt.trim()) {
            return { valid: false, message: 'Prompt cannot be empty.' };
        }
        if (prompt.length > maxLength) {
            return { valid: false, message: `Prompt is too long (${prompt.length} characters). Maximum ${maxLength} characters allowed.` };
        }
        return { valid: true };
    }

    async function saveSettings() {
        const settings = {
            apiKey: apiKeyInput.value,
            systemPrompt: systemPromptInput.value,
            userPrompt: userPromptInput.value
        };
        
        // Cache frequently used prompts
        const timestamp = Date.now();
        const promptHistory = await chrome.storage.local.get(['promptHistory']) || { promptHistory: [] };
        
        if (userPromptInput.value.trim()) {
            const existingIndex = promptHistory.promptHistory.findIndex(p => p.prompt === userPromptInput.value.trim());
            if (existingIndex !== -1) {
                promptHistory.promptHistory[existingIndex].lastUsed = timestamp;
                promptHistory.promptHistory[existingIndex].useCount++;
            } else {
                promptHistory.promptHistory.push({
                    prompt: userPromptInput.value.trim(),
                    lastUsed: timestamp,
                    useCount: 1
                });
            }
            
            // Keep only the 10 most recent prompts
            promptHistory.promptHistory = promptHistory.promptHistory
                .sort((a, b) => b.lastUsed - a.lastUsed)
                .slice(0, 10);
        }
        
        await chrome.storage.local.set({
            ...settings,
            promptHistory: promptHistory.promptHistory
        });
    }

    extractBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const systemPrompt = systemPromptInput.value.trim();
        const userPrompt = userPromptInput.value.trim();
        const format = document.querySelector('input[name="format"]:checked').value;

        // Validate API key
        const apiKeyValidation = validateApiKey(apiKey);
        if (!apiKeyValidation.valid) {
            showStatus(apiKeyValidation.message, true);
            return;
        }

        // Validate user prompt
        const userPromptValidation = validatePrompt(userPrompt);
        if (!userPromptValidation.valid) {
            showStatus(userPromptValidation.message, true);
            return;
        }

        // Validate system prompt if provided
        if (systemPrompt) {
            const systemPromptValidation = validatePrompt(systemPrompt, 2000);
            if (!systemPromptValidation.valid) {
                showStatus(`System prompt: ${systemPromptValidation.message}`, true);
                return;
            }
        }

        extractBtn.disabled = true;
        extractBtn.innerHTML = '<span class="spinner"></span>Processing...';
        
        try {
            updateProgress(10, 'Saving settings...');
            await saveSettings();

            updateProgress(25, 'Getting active tab...');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            updateProgress(40, 'Preparing content script...');
            // Check if content script is ready by injecting it if needed
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        // Test if content script is loaded
                        return typeof window.extractPageData !== 'undefined';
                    }
                });
            } catch (error) {
                // Inject content script if not present
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                // Wait a moment for script to initialize
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            updateProgress(60, 'Extracting page data...');
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractPageData' });
            
            if (!response || !response.success) {
                throw new Error('Failed to extract page data - please refresh the page and try again');
            }

            updateProgress(80, 'Processing with AI...');
            const result = await chrome.runtime.sendMessage({
                action: 'processWithGemini',
                data: {
                    pageData: response.data,
                    apiKey,
                    systemPrompt,
                    userPrompt,
                    format
                }
            });

            if (result.success) {
                updateProgress(100, 'Complete!');
                setTimeout(() => {
                    hideProgress();
                    showStatus(`✅ Data processed and downloaded as ${format.toUpperCase()} file`);
                }, 500);
            } else {
                throw new Error(result.error || 'Processing failed');
            }

        } catch (error) {
            console.error('Error:', error);
            
            // Provide user-friendly error messages
            let userMessage = error.message;
            if (error.message.includes('Failed to extract page data')) {
                userMessage = 'Unable to extract data from this page. Please refresh the page and try again.';
            } else if (error.message.includes('Extension context invalidated')) {
                userMessage = 'Extension needs to be refreshed. Please reload the extension and try again.';
            } else if (error.message.includes('Cannot access')) {
                userMessage = 'Cannot access this page. Please try on a different website.';
            } else if (error.message.includes('network')) {
                userMessage = 'Network error. Please check your internet connection and try again.';
            }
            
            showStatus(`❌ ${userMessage}`, true);
        } finally {
            extractBtn.disabled = false;
            extractBtn.textContent = 'Extract & Process';
            hideProgress();
        }
    });

    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const format = radio.value;
            const examples = {
                csv: 'Extract product names, prices, and descriptions in CSV format',
                text: 'Extract all text content and format it as readable text',
                json: 'Extract structured data and format as JSON',
                links: 'Extract all links with their titles and descriptions'
            };
            userPromptInput.placeholder = examples[format];
        });
    });
});