document.addEventListener('DOMContentLoaded', async () => {
    const apiKeyInput = document.getElementById('apiKey');
    const systemPromptInput = document.getElementById('systemPrompt');
    const userPromptInput = document.getElementById('userPrompt');
    const extractBtn = document.getElementById('extractBtn');
    const statusDiv = document.getElementById('status');

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

    async function saveSettings() {
        await chrome.storage.local.set({
            apiKey: apiKeyInput.value,
            systemPrompt: systemPromptInput.value,
            userPrompt: userPromptInput.value
        });
    }

    extractBtn.addEventListener('click', async () => {
        const apiKey = apiKeyInput.value.trim();
        const systemPrompt = systemPromptInput.value.trim();
        const userPrompt = userPromptInput.value.trim();
        const format = document.querySelector('input[name="format"]:checked').value;

        if (!apiKey) {
            showStatus('Please enter your Gemini API key', true);
            return;
        }

        if (!userPrompt) {
            showStatus('Please enter a user prompt', true);
            return;
        }

        extractBtn.disabled = true;
        extractBtn.textContent = 'Processing...';
        
        try {
            await saveSettings();

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractPageData' });
            
            if (!response.success) {
                throw new Error('Failed to extract page data');
            }

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
                showStatus(`✅ Data processed and downloaded as ${format.toUpperCase()} file`);
            } else {
                throw new Error(result.error || 'Processing failed');
            }

        } catch (error) {
            console.error('Error:', error);
            showStatus(`❌ Error: ${error.message}`, true);
        } finally {
            extractBtn.disabled = false;
            extractBtn.textContent = 'Extract & Process';
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