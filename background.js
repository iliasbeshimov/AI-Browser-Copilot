chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processWithGemini') {
        processWithGemini(request.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }
});

async function processWithGemini(data) {
    const { pageData, apiKey, systemPrompt, userPrompt, format } = data;
    
    const makeRequest = async (retryCount = 0) => {
        try {
            const prompt = createPrompt(pageData, systemPrompt, userPrompt, format);
            
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                
                // Check if we should retry (transient errors)
                const shouldRetry = (response.status === 429 || response.status >= 500) && retryCount < 3;
                
                if (shouldRetry) {
                    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return makeRequest(retryCount + 1);
                }
                
                // Provide specific error guidance based on status code
                let userMessage = `Gemini API error: ${errorMessage}`;
                if (response.status === 400) {
                    userMessage = 'Invalid API request. Please check your prompts and try again.';
                } else if (response.status === 401) {
                    userMessage = 'Invalid API key. Please check your Gemini API key and try again.';
                } else if (response.status === 403) {
                    userMessage = 'API access denied. Please verify your API key has proper permissions.';
                } else if (response.status === 429) {
                    userMessage = 'API rate limit exceeded. Please wait a few minutes and try again.';
                } else if (response.status >= 500) {
                    userMessage = 'Gemini API is temporarily unavailable. Please try again in a few minutes.';
                }
                
                throw new Error(userMessage);
            }

            const result = await response.json();
            
            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }

            const generatedContent = result.candidates[0].content.parts[0].text;
            
            await downloadFile(generatedContent, format, pageData.title || 'extracted_data');
            
            return { success: true, content: generatedContent };
            
        } catch (error) {
            // Retry on network errors
            if ((error.name === 'TypeError' || error.message.includes('network')) && retryCount < 3) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return makeRequest(retryCount + 1);
            }
            throw error;
        }
    };
    
    try {
        return await makeRequest();
    } catch (error) {
        console.error('Error processing with Gemini:', error);
        throw error;
    }
}

function createPrompt(pageData, systemPrompt, userPrompt, format) {
    const contextData = {
        url: pageData.url,
        title: pageData.title,
        text: pageData.text.substring(0, 10000), // Limit text to avoid token limits
        imageCount: pageData.images.length,
        linkCount: pageData.links.length,
        metadata: pageData.metadata,
        images: pageData.images.slice(0, 20), // Limit images
        links: pageData.links.slice(0, 50) // Limit links
    };

    return `${systemPrompt}

USER REQUEST: ${userPrompt}

OUTPUT FORMAT: ${format.toUpperCase()}

WEBPAGE DATA:
URL: ${contextData.url}
Title: ${contextData.title}
Text Content: ${contextData.text}

Metadata:
- Description: ${contextData.metadata.description}
- Keywords: ${contextData.metadata.keywords}
- Author: ${contextData.metadata.author}

Images (${contextData.imageCount} total, showing first 20):
${contextData.images.map(img => `- ${img.src} (Alt: ${img.alt}, ${img.width}x${img.height})`).join('\n')}

Links (${contextData.linkCount} total, showing first 50):
${contextData.links.map(link => `- ${link.href} (Text: ${link.text})`).join('\n')}

Please process this data according to the user request and output in the specified format.`;
}

function sanitizeFilename(filename) {
    // Remove or replace invalid filename characters
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars with underscore
        .replace(/\s+/g, '_')           // Replace spaces with underscore
        .replace(/_+/g, '_')            // Replace multiple underscores with single
        .replace(/^_|_$/g, '')          // Remove leading/trailing underscores
        .substring(0, 100)              // Limit length to 100 chars
        || 'extracted_data';            // Fallback if empty
}

async function downloadFile(content, format, filename) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const extensions = {
        csv: 'csv',
        text: 'txt',
        json: 'json',
        links: 'txt'
    };
    
    const extension = extensions[format] || 'txt';
    const sanitizedFilename = sanitizeFilename(filename);
    const downloadFilename = `${sanitizedFilename}_${timestamp}.${extension}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    try {
        await chrome.downloads.download({
            url: url,
            filename: downloadFilename,
            saveAs: false
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}