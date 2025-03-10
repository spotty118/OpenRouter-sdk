/**
 * OpenRouter SDK Demo Application
 * Client-side implementation showcasing OpenRouter SDK capabilities
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables with proper documentation
    
    /**
     * API Key management with secure storage
     * Note: For production applications, consider using more secure storage methods
     * than localStorage, such as HTTP-only cookies, session storage with proper expiration,
     * or authenticated endpoints that handle the API key server-side
     */
    let apiKey = localStorage.getItem('openrouter_api_key') || '';
    
    // SDK instance and state management
    let openRouter = null;
    let chatMessages = [];
    let streamMessages = [];
    let vectorDbs = {};
    
    // Track initialization status
    let sdkInitialized = false;

    // Set API key in UI if available
    const apiKeyInput = document.getElementById('api-key');
    
    // Mask the API key in the UI for security (show only last 4 characters)
    if (apiKey) {
        apiKeyInput.value = apiKey;
        
        // Show partial key in UI elements that display the key
        const keyDisplays = document.querySelectorAll('.api-key-display');
        const maskedKey = maskApiKey(apiKey);
        keyDisplays.forEach(el => {
            if (el) el.textContent = maskedKey;
        });
        
        // Initialize OpenRouter with the API key
        initializeOpenRouter(apiKey);
    }

    /**
     * API Key validation and storage
     * Checks for basic validation before saving and initializing
     */
    document.getElementById('save-api-key').addEventListener('click', function() {
        const newApiKey = apiKeyInput.value.trim();
        
        // Basic API key validation
        if (!newApiKey) {
            showError('API Key Error', 'Please enter a valid API key');
            return;
        }
        
        // Simple format validation (OpenRouter keys are typically long strings)
        if (newApiKey.length < 20) { 
            showError('API Key Error', 'The API key appears to be too short. Please check your key.');
            return;
        }
        
        // Save and initialize
        apiKey = newApiKey;
        localStorage.setItem('openrouter_api_key', apiKey);
        
        // Display success message
        showSuccess('API key saved successfully!');
        
        // Re-initialize with new key
        initializeOpenRouter(apiKey);
        
        // Update masked displays
        const keyDisplays = document.querySelectorAll('.api-key-display');
        const maskedKey = maskApiKey(apiKey);
        keyDisplays.forEach(el => {
            if (el) el.textContent = maskedKey;
        });
    });
    
    // Clear API key
    document.getElementById('clear-api-key')?.addEventListener('click', function() {
        apiKey = '';
        localStorage.removeItem('openrouter_api_key');
        apiKeyInput.value = '';
        openRouter = null;
        sdkInitialized = false;
        showSuccess('API key cleared successfully!');
        updateStatusIndicators(false);
    });

    /**
     * Helper function to mask API key for display
     * Shows only the last 4 characters, masking the rest with asterisks
     * @param {string} key - The full API key
     * @returns {string} - The masked API key
     */
    function maskApiKey(key) {
        if (!key || key.length <= 4) return key;
        return '•'.repeat(key.length - 4) + key.slice(-4);
    }
    
    /**
     * Helper function to show error messages consistently
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {number} [duration=5000] - Duration in ms before auto-hiding the message
     */
    function showError(title, message, duration = 5000) {
        console.error(`${title}: ${message}`);
        // Check if we have a dedicated error container
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="error-message"><strong>${title}</strong>: ${message}</div>`;
            errorContainer.style.display = 'block';
            // Auto-hide after specified duration
            setTimeout(() => {
                errorContainer.style.display = 'none';
            }, duration);
        } else {
            // Fallback to alert
            alert(`${title}: ${message}`);
        }
    }
    
    /**
     * Helper function to show success messages consistently
     * @param {string} message - Success message
     * @param {number} [duration=3000] - Duration in ms before auto-hiding the message
     */
    function showSuccess(message, duration = 3000) {
        console.log(`Success: ${message}`);
        // Check if we have a dedicated success container
        const successContainer = document.getElementById('success-container');
        if (successContainer) {
            successContainer.innerHTML = `<div class="success-message">${message}</div>`;
            successContainer.style.display = 'block';
            // Auto-hide after specified duration
            setTimeout(() => {
                successContainer.style.display = 'none';
            }, duration);
        } else {
            // Fallback to alert
            alert(message);
        }
    }
    
    /**
     * Update status indicators throughout the UI
     * @param {boolean} isInitialized - Whether the SDK is initialized
     */
    function updateStatusIndicators(isInitialized) {
        const statusIndicators = document.querySelectorAll('.sdk-status');
        statusIndicators.forEach(indicator => {
            if (indicator) {
                indicator.className = 'sdk-status ' + (isInitialized ? 'status-ready' : 'status-error');
                indicator.textContent = isInitialized ? 'SDK Ready' : 'SDK Not Initialized';
            }
        });
    }
    
    /**
     * Initialize OpenRouter SDK with proper error handling
     * @param {string} key - The API key to use
     * @returns {Promise<void>}
     */
    async function initializeOpenRouter(key) {
        try {
            // Validate key format before attempting initialization
            if (!key || typeof key !== 'string' || key.trim().length < 20) {
                throw new Error('Invalid API key format. OpenRouter API keys should be at least 20 characters long.');
            }
            
            // This assumes the OpenRouter SDK is available as a global variable
            // In a real implementation, you would import it properly using module bundlers
            if (typeof OpenRouter !== 'undefined') {
                // Create SDK instance with configuration
                openRouter = new OpenRouter({
                    apiKey: key,
                    defaultModel: 'openai/gpt-3.5-turbo',
                    // Add additional configuration for better error handling
                    maxRetries: 3,
                    timeout: 60000, // 60 seconds
                    debug: false    // Set to true for verbose logging during development
                });
                
                try {
                    // Test the connection by listing models
                    const models = await openRouter.listModels();
                    
                    if (!models || !models.data || !Array.isArray(models.data)) {
                        throw new Error('Invalid response from OpenRouter API');
                    }
                    
                    console.log(`SDK initialized with ${models.data.length} available models`); 
                    sdkInitialized = true;
                    updateStatusIndicators(true);
                    showSuccess('OpenRouter SDK initialized successfully!');
                    
                    // Populate model dropdowns with available models
                    populateModelDropdowns(models.data);
                } catch (error) {
                    console.error('API connection error:', error);
                    sdkInitialized = false;
                    updateStatusIndicators(false);
                    
                    // Provide helpful error messages based on error type
                    if (error.status === 401) {
                        showError('Authentication Error', 'The provided API key is invalid. Please check your key.');
                    } else if (error.status === 403) {
                        showError('Permission Error', 'The API key does not have permission to access this resource.');
                    } else if (error.status === 429) {
                        showError('Rate Limit Error', 'You have exceeded your rate limit. Please try again later.');
                    } else if (error.message && error.message.includes('timeout')) {
                        showError('Timeout Error', 'The connection to OpenRouter timed out. Please try again later.');
                    } else if (error.message && error.message.includes('network')) {
                        showError('Network Error', 'Unable to connect to OpenRouter. Please check your internet connection.');
                    } else {
                        showError('API Error', error.message || 'Failed to connect to OpenRouter API');
                    }
                }
            } else {
                console.error('OpenRouter SDK not found. Make sure the script is loaded correctly.');
                showError('SDK Error', 'OpenRouter SDK not found. Make sure the script is loaded correctly.');
                updateStatusIndicators(false);
            }
        } catch (error) {
            console.error('Failed to initialize OpenRouter:', error);
            showError('SDK Error', 'Failed to initialize OpenRouter SDK: ' + (error.message || 'Unknown error'));
            updateStatusIndicators(false);
        }
    }
    
    /**
     * Populates model selection dropdowns with available models
     * @param {Array} models - Array of available models from the API
     */
    function populateModelDropdowns(models) {
        if (!Array.isArray(models) || models.length === 0) return;
        
        // Get all model select dropdowns
        const modelSelects = document.querySelectorAll('select[id$="-model"]');
        
        modelSelects.forEach(select => {
            // Store current selection if any
            const currentSelection = select.value;
            
            // Clear existing options except the default ones (first ones)
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add models as options
            models.forEach(model => {
                if (!model.id) return;
                
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.id}${model.pricing ? ` - $${model.pricing.prompt}/1M in, $${model.pricing.completion}/1M out` : ''}`;
                select.appendChild(option);
                
                // If this was the previously selected model, reselect it
                if (model.id === currentSelection) {
                    select.value = model.id;
                }
            });
        });
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to current button and pane
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Temperature sliders
    const chatTemperatureSlider = document.getElementById('chat-temperature');
    const chatTemperatureValue = document.getElementById('chat-temperature-value');
    const streamTemperatureSlider = document.getElementById('stream-temperature');
    const streamTemperatureValue = document.getElementById('stream-temperature-value');

    chatTemperatureSlider.addEventListener('input', function() {
        chatTemperatureValue.textContent = this.value;
    });

    streamTemperatureSlider.addEventListener('input', function() {
        streamTemperatureValue.textContent = this.value;
    });

    // Vector DB action selection
    const vectorDbAction = document.getElementById('vectordb-action');
    const vectorDbCreateForm = document.getElementById('vectordb-create-form');
    const vectorDbAddForm = document.getElementById('vectordb-add-form');
    const vectorDbSearchForm = document.getElementById('vectordb-search-form');

    vectorDbAction.addEventListener('change', function() {
        const action = this.value;
        
        // Hide all forms
        vectorDbCreateForm.style.display = 'none';
        vectorDbAddForm.style.display = 'none';
        vectorDbSearchForm.style.display = 'none';
        
        // Show selected form
        if (action === 'create') {
            vectorDbCreateForm.style.display = 'block';
        } else if (action === 'add') {
            vectorDbAddForm.style.display = 'block';
        } else if (action === 'search') {
            vectorDbSearchForm.style.display = 'block';
        }
    });

    /**
     * Chat Completions
     * Handles sending chat messages to the API and displaying responses
     */
    document.getElementById('chat-send').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    /**
     * Send a chat message to OpenRouter API and display the response
     * Includes improved error handling and UI feedback
     */
    /**
     * Send a chat message to the OpenRouter API and handle the response
     * @returns {Promise<void>}
     */
    async function sendChatMessage() {
        // Verify SDK initialization
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }
        
        // Validate input
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) {
            console.error('Chat input element not found');
            return;
        }
        
        const userMessage = chatInput.value.trim();
        
        if (!userMessage) {
            showError('Input Error', 'Please enter a message', 2000);
            return;
        }
        
        // Clear input and focus for next message
        chatInput.value = '';
        chatInput.focus();
        
        // Get chat settings with validation
        const modelSelect = document.getElementById('chat-model');
        if (!modelSelect) {
            console.error('Model selection element not found');
            return;
        }
        
        const model = modelSelect.value;
        if (!model) {
            showError('Configuration Error', 'Please select a model');
            return;
        }
        
        // Initialize with safe defaults
        let temperature = 0.7; // Default
        let maxTokens = 1000; // Default
        
        try {
            // Get and validate temperature
            const tempElement = document.getElementById('chat-temperature');
            if (tempElement) {
                temperature = parseFloat(tempElement.value);
                if (isNaN(temperature) || temperature < 0 || temperature > 2) {
                    temperature = 0.7; // Reset to default if invalid
                    console.warn('Invalid temperature value, using default of 0.7');
                }
            }
            
            // Get and validate max tokens
            const maxTokensElement = document.getElementById('chat-max-tokens');
            if (maxTokensElement) {
                maxTokens = parseInt(maxTokensElement.value);
                if (isNaN(maxTokens) || maxTokens < 1 || maxTokens > 8192) {
                    maxTokens = 1000; // Reset to default if invalid
                    console.warn('Invalid max_tokens value, using default of 1000');
                }
            }
        } catch (e) {
            console.warn('Error parsing parameters, using defaults:', e);
        }
        
        // Get system message if provided
        const systemMessageElement = document.getElementById('chat-system-message');
        const systemMessage = systemMessageElement ? systemMessageElement.value.trim() : '';
        
        // Add system message if provided and not already added
        if (systemMessage && !chatMessages.some(msg => msg.role === 'system')) {
            chatMessages.push({ role: 'system', content: systemMessage });
        }
        
        // Add user message
        chatMessages.push({ role: 'user', content: userMessage });
        
        // Update chat UI
        updateChatUI('chat-messages', chatMessages);
        
        // Track request start time for latency calculation
        const requestStartTime = Date.now();
        
        // Get message container for status updates
        const messagesContainer = document.getElementById('chat-messages');
        
        // Validate messagesContainer exists
        if (!messagesContainer) {
            console.error('Chat messages container not found');
            return;
        }
        
        try {
            // Add loading indicator with unique ID for easy removal
            const loadingId = 'loading-' + Date.now();
            const loadingDiv = document.createElement('div');
            loadingDiv.id = loadingId;
            loadingDiv.className = 'message-container loading-container';
            loadingDiv.innerHTML = '<div class="message-header assistant-header">Assistant</div><div class="message assistant-message"><div class="loading"></div></div>';
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Show model information
            const statusContainer = document.getElementById('chat-status') || document.createElement('div');
            statusContainer.innerHTML = `<span class="status-info">Requesting: ${model}, temp: ${temperature}</span>`;
            
            // Prepare request with proper error handling
            const response = await openRouter.createChatCompletion({
                model: model,
                messages: chatMessages,
                temperature: temperature,
                max_tokens: maxTokens
            });
            
            // Calculate latency
            const latencyMs = Date.now() - requestStartTime;
            
            // Remove loading indicator
            const loadingElement = document.getElementById(loadingId);
            if (loadingElement) {
                messagesContainer.removeChild(loadingElement);
            }
            
            // Process and validate response
            if (response && response.choices && response.choices.length > 0) {
                // Add assistant response
                const assistantMessage = response.choices[0].message;
                chatMessages.push(assistantMessage);
                
                // Update chat UI
                updateChatUI('chat-messages', chatMessages);
                
                // Update status with usage information if available
                if (response.usage) {
                    const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
                    if (statusContainer) {
                        statusContainer.innerHTML = `<span class="status-info">Model: ${model}, Latency: ${latencyMs}ms, Tokens: ${prompt_tokens}+${completion_tokens}=${total_tokens}</span>`;
                    }
                }
            } else {
                throw new Error('Received empty response from API');
            }
            
        } catch (error) {
            console.error('Chat completion error:', error);
            
            // Clean up any remaining loading indicators
            const loadingElements = document.querySelectorAll('.loading-container');
            loadingElements.forEach(el => el.remove());
            
            // Add error message to chat instead of alert
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message-container error-container';
            
            // Provide more specific error messages based on error type
            let errorMessage = 'Failed to get a response from the AI';
            let errorTitle = 'API Error';
            
            if (error.status === 401) {
                errorTitle = 'Authentication Error';
                errorMessage = 'API key is invalid or expired. Please check your API key.';
            } else if (error.status === 403) {
                errorTitle = 'Permission Error';
                errorMessage = 'The API key does not have permission to access this resource.';
            } else if (error.status === 404) {
                errorTitle = 'Model Not Found';
                errorMessage = 'The requested model was not found. Please select a different model.';
            } else if (error.status === 429) {
                errorTitle = 'Rate Limit Error';
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (error.message && error.message.includes('timeout')) {
                errorTitle = 'Timeout Error';
                errorMessage = 'Request timed out. The model might be busy, please try again.';
            } else if (error.message && error.message.includes('network')) {
                errorTitle = 'Network Error';
                errorMessage = 'Network connection error. Please check your internet connection.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Log for debugging
            console.warn(`${errorTitle}: ${errorMessage}`);
            
            errorDiv.innerHTML = `
                <div class="message-header error-header">${errorTitle}</div>
                <div class="message error-message">${errorMessage}</div>
            `;
            
            messagesContainer.appendChild(errorDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Also update the status container with the error
            const statusContainer = document.getElementById('chat-status');
            if (statusContainer) {
                statusContainer.innerHTML = `<span class="status-error">${errorTitle}: ${errorMessage}</span>`;
            }
        }
    }

    /**
     * Streaming Chat Functionality
     * Handles sending chat messages to the API with streaming response
     */
    document.getElementById('stream-send').addEventListener('click', sendStreamMessage);
    document.getElementById('stream-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendStreamMessage();
        }
    });

    /**
     * Send a chat message with streaming response
     * Includes improved error handling and UI feedback for token-by-token streaming
     */
    async function sendStreamMessage() {
        // Verify SDK initialization
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        // Validate input
        const streamInput = document.getElementById('stream-input');
        const userMessage = streamInput.value.trim();
        
        if (!userMessage) return;
        
        // Clear input
        streamInput.value = '';
        
        // Get stream settings with validation
        const model = document.getElementById('stream-model').value;
        let temperature = 0.7; // Default
        let maxTokens = 1000; // Default
        
        try {
            temperature = parseFloat(document.getElementById('stream-temperature').value);
            if (isNaN(temperature) || temperature < 0 || temperature > 2) {
                temperature = 0.7; // Reset to default if invalid
                console.warn('Invalid temperature value for streaming, using default of 0.7');
            }
            
            maxTokens = parseInt(document.getElementById('stream-max-tokens').value);
            if (isNaN(maxTokens) || maxTokens < 1) {
                maxTokens = 1000; // Reset to default if invalid
                console.warn('Invalid max_tokens value for streaming, using default of 1000');
            }
        } catch (e) {
            console.warn('Error parsing streaming parameters, using defaults:', e);
        }
        
        const systemMessage = document.getElementById('stream-system-message').value.trim();
        
        // Add system message if provided and not already added
        if (systemMessage && !streamMessages.some(msg => msg.role === 'system')) {
            streamMessages.push({ role: 'system', content: systemMessage });
        }
        
        // Add user message
        streamMessages.push({ role: 'user', content: userMessage });
        
        // Update stream UI
        updateChatUI('stream-messages', streamMessages);
        
        // Track request start time for latency calculation
        const requestStartTime = Date.now();
        
        // Add status display
        const statusContainer = document.getElementById('stream-status') || document.createElement('div');
        if (statusContainer) {
            statusContainer.innerHTML = `<span class="status-info">Requesting stream: ${model}, temp: ${temperature}</span>`;
        }
        
        try {
            // Get container and prepare for streaming
            const messagesContainer = document.getElementById('stream-messages');
            
            // Validate messagesContainer exists
            if (!messagesContainer) {
                console.error('Stream messages container not found');
                return;
            }
            
            // Create unique streaming container for this message
            const streamId = 'stream-' + Date.now();
            const streamContainer = document.createElement('div');
            streamContainer.className = 'message-container';
            streamContainer.innerHTML = `
                <div class="message-header assistant-header">Assistant</div>
                <div class="message assistant-message" id="${streamId}"></div>
            `;
            messagesContainer.appendChild(streamContainer);
            const streamElement = document.getElementById(streamId);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Initialize streaming variables
            let streamContent = '';
            let tokenCount = 0;
            let streamStarted = false;
            let streamingLatency = 0;
            
            // Add initial typing indicator
            streamElement.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
            
            // Start streaming with error handling
            try {
                for await (const chunk of openRouter.streamChatCompletions({
                    model: model,
                    messages: streamMessages,
                    temperature: temperature,
                    max_tokens: maxTokens
                })) {
                    // Record time to first token
                    if (!streamStarted) {
                        streamStarted = true;
                        streamingLatency = Date.now() - requestStartTime;
                        // Update status with the latency time
                        if (statusContainer) {
                            statusContainer.innerHTML = `<span class="status-info">Streaming: ${model}, First token: ${streamingLatency}ms</span>`;
                        }
                    }
                    
                    const content = chunk.choices?.[0]?.delta?.content || '';
                    if (content) {
                        // Remove typing indicator on first real content
                        if (streamContent === '') {
                            streamElement.innerHTML = '';
                        }
                        
                        streamContent += content;
                        tokenCount++;
                        
                        // Apply formatting to the content
                        streamElement.textContent = streamContent;
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        
                        // Periodically update token count in status
                        if (tokenCount % 10 === 0 && statusContainer) {
                            statusContainer.innerHTML = `<span class="status-info">Streaming: ${model}, Tokens: ${tokenCount}</span>`;
                        }
                    }
                }
                
                // Add message to history once complete
                streamMessages.push({ role: 'assistant', content: streamContent });
                
                // Update final status
                if (statusContainer) {
                    statusContainer.innerHTML = `<span class="status-info">Complete: ${model}, Tokens: ${tokenCount}, Latency: ${streamingLatency}ms</span>`;
                }
                
                // Remove stream ID to prevent overwriting
                streamElement.removeAttribute('id');
                
            } catch (streamError) {
                console.error('Stream processing error:', streamError);
                // Display error in the stream output instead of removing it
                streamElement.innerHTML = `<div class="error-message">Error during streaming: ${streamError.message || 'Connection error'}</div>`;
                throw streamError; // Re-throw to be caught by outer handler
            }
            
        } catch (error) {
            console.error('Stream setup error:', error);
            
            // Display error in the stream container
            const messagesContainer = document.getElementById('stream-messages');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message-container error-container';
            
            // Provide more specific error messages based on error type
            let errorMessage = 'Failed to stream response';
            
            if (error.status === 401) {
                errorMessage = 'API key is invalid or expired. Please check your API key.';
            } else if (error.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (error.message && error.message.includes('timeout')) {
                errorMessage = 'Stream request timed out. The model might be busy, please try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            errorDiv.innerHTML = `
                <div class="message-header error-header">Error</div>
                <div class="message error-message">${errorMessage}</div>
            `;
            
            messagesContainer.appendChild(errorDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Update status with error
            if (statusContainer) {
                statusContainer.innerHTML = `<span class="status-error">Streaming failed: ${errorMessage}</span>`;
            }
        }
    }

    // Update chat UI
    /**
     * Update chat UI with formatted messages
     * @param {string} containerId - ID of the container element
     * @param {Array} messages - Array of message objects
     * @param {boolean} [formatMarkdown=true] - Whether to format assistant messages with markdown
     */
    function updateChatUI(containerId, messages, formatMarkdown = true) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container not found: ${containerId}`);
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Add messages
        messages.forEach(message => {
            if (!message || !message.role || !message.content) {
                console.warn('Invalid message format', message);
                return;
            }
            
            if (message.role === 'system') {
                const systemDiv = document.createElement('div');
                systemDiv.className = 'system-message';
                systemDiv.textContent = `System: ${message.content}`;
                container.appendChild(systemDiv);
            } else {
                const messageContainer = document.createElement('div');
                messageContainer.className = 'message-container';
                
                const header = document.createElement('div');
                header.className = `message-header ${message.role}-header`;
                header.textContent = message.role === 'user' ? 'You' : 'Assistant';
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${message.role}-message`;
                
                // Apply markdown formatting for assistant messages if enabled
                if (formatMarkdown && message.role === 'assistant') {
                    messageDiv.innerHTML = formatMessageContent(message.content);
                } else {
                    messageDiv.textContent = message.content;
                }
                
                messageContainer.appendChild(header);
                messageContainer.appendChild(messageDiv);
                container.appendChild(messageContainer);
            }
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * Format message content with markdown-like syntax
     * @param {string} content - Raw message content
     * @returns {string} - HTML formatted content
     */
    function formatMessageContent(content) {
        if (!content) return '';
        
        // Safety check
        if (typeof content !== 'string') {
            return String(content);
        }
        
        let formatted = content;
        
        // Format code blocks - ```code```
        formatted = formatted.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
            return `<pre class="code-block"><code>${escapeHtml(codeContent.trim())}</code></pre>`;
        });
        
        // Format inline code - `code`
        formatted = formatted.replace(/`([^`]+)`/g, (match, codeContent) => {
            return `<code class="inline-code">${escapeHtml(codeContent)}</code>`;
        });
        
        // Convert line breaks to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} html - String that may contain HTML
     * @returns {string} - Escaped string
     */
    function escapeHtml(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }

    // Embeddings
    document.getElementById('embedding-generate').addEventListener('click', async function() {
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        const model = document.getElementById('embedding-model').value;
        const input = document.getElementById('embedding-input').value.trim();
        
        if (!input) {
            alert('Please enter some text to generate embeddings for');
            return;
        }
        
        const resultContainer = document.getElementById('embedding-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            const response = await openRouter.createEmbedding({
                model: model,
                input: input
            });
            
            // Display first 10 values of embedding
            const embedding = response.data[0].embedding;
            const truncatedEmbedding = embedding.slice(0, 10);
            
            resultContainer.innerHTML = `
                <p>Generated ${embedding.length}-dimensional embedding vector:</p>
                <p>[${truncatedEmbedding.map(v => v.toFixed(6)).join(', ')}, ...]</p>
                <p>Total tokens: ${response.usage.total_tokens}</p>
            `;
        } catch (error) {
            console.error('Embedding error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to generate embeddings'}</p>`;
        }
    });

    // Image Generation
    document.getElementById('image-generate').addEventListener('click', async function() {
        if (!openRouter) {
            alert('Please set your OpenRouter API key first');
            return;
        }

        const model = document.getElementById('image-model').value;
        const prompt = document.getElementById('image-prompt').value.trim();
        const size = document.getElementById('image-size').value;
        const quality = document.getElementById('image-quality').value;
        
        if (!prompt) {
            alert('Please enter a prompt for image generation');
            return;
        }
        
        const resultContainer = document.getElementById('image-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            const response = await openRouter.createImage({
                model: model,
                prompt: prompt,
                size: size,
                quality: quality
            });
            
            // Display generated image
            const imageUrl = response.data[0].url;
            resultContainer.innerHTML = `<img src="${imageUrl}" alt="Generated image">`;
        } catch (error) {
            console.error('Image generation error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to generate image'}</p>`;
        }
    });

    // Audio Transcription
    document.getElementById('audio-transcribe').addEventListener('click', async function() {
        if (!openRouter) {
            alert('Please set your OpenRouter API key first');
            return;
        }

        const model = document.getElementById('audio-model').value;
        const fileInput = document.getElementById('audio-file');
        const language = document.getElementById('audio-language').value.trim();
        
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select an audio file to transcribe');
            return;
        }
        
        const resultContainer = document.getElementById('audio-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            const file = fileInput.files[0];
            
            const response = await openRouter.createTranscription({
                model: model,
                file: file,
                language: language || undefined
            });
            
            // Display transcription
            resultContainer.innerHTML = `<p>${response.text}</p>`;
        } catch (error) {
            console.error('Transcription error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to transcribe audio'}</p>`;
        }
    });

    // Function Calling
    document.getElementById('function-call').addEventListener('click', async function() {
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        const model = document.getElementById('function-model').value;
        const prompt = document.getElementById('function-prompt').value.trim();
        const functionsJson = document.getElementById('function-definitions').value.trim();
        
        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }
        
        if (!functionsJson) {
            alert('Please define at least one function');
            return;
        }
        
        let functions;
        try {
            functions = JSON.parse(functionsJson);
        } catch (error) {
            alert('Invalid JSON for function definitions');
            return;
        }
        
        const resultContainer = document.getElementById('function-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            // Convert functions to tools format
            const tools = functions.map(func => ({
                type: 'function',
                function: func
            }));
            
            const response = await openRouter.createChatCompletion({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                tools: tools,
                tool_choice: 'auto'
            });
            
            // Check if the model called a function
            const message = response.choices[0].message;
            const toolCalls = message.tool_calls;
            
            if (toolCalls && toolCalls.length > 0) {
                // Display function calls
                let resultHtml = '<h4>Function Calls:</h4>';
                
                toolCalls.forEach(call => {
                    if (call.type === 'function') {
                        resultHtml += `
                            <div class="function-call">
                                <p><strong>Function:</strong> ${call.function.name}</p>
                                <p><strong>Arguments:</strong></p>
                                <pre>${JSON.stringify(JSON.parse(call.function.arguments), null, 2)}</pre>
                            </div>
                        `;
                    }
                });
                
                resultHtml += `<h4>Model Response:</h4><p>${message.content || '(No content, only function calls)'}</p>`;
                resultContainer.innerHTML = resultHtml;
            } else {
                // No function calls, just display the response
                resultContainer.innerHTML = `<p>${message.content}</p>`;
            }
        } catch (error) {
            console.error('Function calling error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to call functions'}</p>`;
        }
    });

    // Vector DB operations
    document.getElementById('vectordb-execute').addEventListener('click', async function() {
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        const action = document.getElementById('vectordb-action').value;
        const resultContainer = document.getElementById('vectordb-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            if (action === 'create') {
                const id = document.getElementById('vectordb-id').value.trim();
                const dimensions = parseInt(document.getElementById('vectordb-dimensions').value);
                const metric = document.getElementById('vectordb-metric').value;
                
                if (!id) {
                    throw new Error('Please enter a Vector DB ID');
                }
                
                // Create vector DB
                // Create AIOrchestrator for Chroma operations
                const orchestrator = new AIOrchestrator({
                    apiKey: apiKey,
                    defaultModel: 'anthropic/claude-3-opus'
                });
                
                // Create vector DB with Chroma
                vectorDbs[id] = await orchestrator.createVectorDb(id, {
                    dimensions: dimensions,
                    similarityMetric: metric,
                    maxVectors: 10000
                });
                
                resultContainer.innerHTML = `<p>Chroma Vector DB "${id}" created successfully with ${dimensions} dimensions and ${metric} similarity metric.</p>`;
            } else if (action === 'add') {
                const id = document.getElementById('vectordb-add-id').value.trim();
                const documentsJson = document.getElementById('vectordb-documents').value.trim();
                
                if (!id) {
                    throw new Error('Please enter a Vector DB ID');
                }
                
                if (!vectorDbs[id]) {
                    // Create AIOrchestrator for Chroma operations
                    const orchestrator = new AIOrchestrator({
                        apiKey: apiKey,
                        defaultModel: 'anthropic/claude-3-opus'
                    });
                    
                    // Create vector DB with Chroma
                    vectorDbs[id] = await orchestrator.createVectorDb(id, {
                        dimensions: 1536,
                        similarityMetric: 'cosine',
                        maxVectors: 10000
                    });
                }
                
                if (!documentsJson) {
                    throw new Error('Please enter documents to add');
                }
                
                // Parse documents
                const documents = JSON.parse(documentsJson);
                
                // Add documents
                const docIds = await vectorDbs[id].addDocuments(documents);
                
                resultContainer.innerHTML = `<p>Added ${docIds.length} documents to Chroma Vector DB "${id}".</p>`;
            } else if (action === 'search') {
                const id = document.getElementById('vectordb-search-id').value.trim();
                const query = document.getElementById('vectordb-query').value.trim();
                const limit = parseInt(document.getElementById('vectordb-limit').value);
                
                if (!id) {
                    throw new Error('Please enter a Vector DB ID');
                }
                
                if (!vectorDbs[id]) {
                    // Create AIOrchestrator for Chroma operations
                    const orchestrator = new AIOrchestrator({
                        apiKey: apiKey,
                        defaultModel: 'anthropic/claude-3-opus'
                    });
                    
                    // Create vector DB with Chroma
                    vectorDbs[id] = await orchestrator.createVectorDb(id, {
                        dimensions: 1536,
                        similarityMetric: 'cosine',
                        maxVectors: 10000
                    });
                }
                
                if (!query) {
                    throw new Error('Please enter a search query');
                }
                
                // Search
                const results = await vectorDbs[id].searchByText(query, { limit });
                
                // Display results
                let resultHtml = `<p>Found ${results.length} results for "${query}" in Chroma Vector DB "${id}":</p>`;
                
                if (results.length > 0) {
                    resultHtml += '<ul>';
                    results.forEach(result => {
                        resultHtml += `
                            <li>
                                <p><strong>Score:</strong> ${result.score.toFixed(4)}</p>
                                <p><strong>Content:</strong> ${result.document.content}</p>
                                <p><strong>Metadata:</strong> ${JSON.stringify(result.document.metadata)}</p>
                            </li>
                        `;
                    });
                    resultHtml += '</ul>';
                }
                
                resultContainer.innerHTML = resultHtml;
            }
        } catch (error) {
            console.error('Vector DB error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Vector DB operation failed'}</p>`;
        }
    });

    // Knowledge Agents
    document.getElementById('add-agent-knowledge').addEventListener('click', async function() {
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        const agentId = document.getElementById('agent-knowledge-id').value.trim();
        const documentsJson = document.getElementById('agent-knowledge-docs').value.trim();
        
        if (!agentId) {
            alert('Please enter an Agent ID');
            return;
        }
        
        if (!documentsJson) {
            alert('Please enter knowledge documents');
            return;
        }
        
        let documents;
        try {
            documents = JSON.parse(documentsJson);
        } catch (error) {
            alert('Invalid JSON for knowledge documents');
            return;
        }
        
        const resultContainer = document.getElementById('agent-knowledge-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            // Create AIOrchestrator
            const orchestrator = new AIOrchestrator({
                apiKey: apiKey,
                defaultModel: 'anthropic/claude-3-opus'
            });
            
            // Create agent if it doesn't exist
            orchestrator.createAgent({
                id: agentId,
                name: 'Knowledge Agent',
                description: 'Agent with knowledge base',
                model: 'anthropic/claude-3-opus'
            });
            
            // Add knowledge to agent
            const docIds = await orchestrator.addAgentKnowledgeBatch(agentId, documents);
            
            resultContainer.innerHTML = `<p>Added ${docIds.length} documents to agent "${agentId}" Chroma knowledge base.</p>`;
        } catch (error) {
            console.error('Add agent knowledge error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to add knowledge to agent'}</p>`;
        }
    });
    
    document.getElementById('search-agent-knowledge').addEventListener('click', async function() {
        if (!openRouter) {
            alert('Please set your OpenRouter API key first');
            return;
        }

        const agentId = document.getElementById('agent-knowledge-id').value.trim();
        const query = document.getElementById('agent-knowledge-query').value.trim();
        
        if (!agentId) {
            alert('Please enter an Agent ID');
            return;
        }
        
        if (!query) {
            alert('Please enter a search query');
            return;
        }
        
        const resultContainer = document.getElementById('agent-knowledge-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            // Create AIOrchestrator
            const orchestrator = new AIOrchestrator({
                apiKey: apiKey,
                defaultModel: 'anthropic/claude-3-opus'
            });
            
            // Search agent knowledge
            const results = await orchestrator.searchAgentKnowledge(agentId, query, { limit: 5 });
            
            // Display results
            let resultHtml = `<p>Found ${results.length} results for "${query}" in agent "${agentId}" Chroma knowledge base:</p>`;
            
            if (results.length > 0) {
                resultHtml += '<ul>';
                results.forEach(result => {
                    resultHtml += `
                        <li>
                            <p><strong>Score:</strong> ${result.score.toFixed(4)}</p>
                            <p><strong>Content:</strong> ${result.document.content}</p>
                            <p><strong>Metadata:</strong> ${JSON.stringify(result.document.metadata)}</p>
                        </li>
                    `;
                });
                resultHtml += '</ul>';
            } else {
                resultHtml += '<p>No results found in Chroma. Try adding knowledge to the agent first.</p>';
            }
            
            resultContainer.innerHTML = resultHtml;
        } catch (error) {
            console.error('Search agent knowledge error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to search agent knowledge'}</p>`;
        }
    });
    
    document.getElementById('run-knowledge-workflow').addEventListener('click', async function() {
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        const configJson = document.getElementById('knowledge-workflow-config').value.trim();
        
        if (!configJson) {
            alert('Please enter workflow configuration');
            return;
        }
        
        let config;
        try {
            config = JSON.parse(configJson);
        } catch (error) {
            alert('Invalid JSON for workflow configuration');
            return;
        }
        
        const resultContainer = document.getElementById('knowledge-workflow-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            // Create AIOrchestrator
            const orchestrator = new AIOrchestrator({
                apiKey: apiKey,
                defaultModel: 'anthropic/claude-3-opus'
            });
            
            // Create agents
            const agents = {};
            for (const agentConfig of config.agents) {
                const agent = orchestrator.createAgent(agentConfig);
                agents[agent.id] = agent;
            }
            
            // Create tasks
            const tasks = {};
            for (const taskConfig of config.tasks) {
                const task = orchestrator.createTask(taskConfig);
                tasks[task.id] = task;
            }
            
            // Create workflow
            const workflow = orchestrator.createWorkflow({
                id: config.workflow.id,
                name: config.workflow.name,
                tasks: Object.values(tasks),
                dependencies: config.workflow.dependencies
            });
            
            // Execute workflow
            resultContainer.innerHTML = '<p>Executing workflow with Chroma knowledge-enabled agents... (this may take a while)</p>';
            const results = await orchestrator.executeWorkflow(workflow);
            
            // Display results
            let resultHtml = '<h4>Workflow Results:</h4>';
            
            for (const [taskId, result] of Object.entries(results)) {
                resultHtml += `
                    <div class="task-result">
                        <h5>Task: ${taskId}</h5>
                        <p><strong>Agent:</strong> ${result.agentId}</p>
                        <p><strong>Used Knowledge:</strong> ${result.usedKnowledge ? 'Yes' : 'No'}</p>
                        ${result.knowledgeCount ? `<p><strong>Knowledge Documents:</strong> ${result.knowledgeCount}</p>` : ''}
                        <p><strong>Output:</strong></p>
                        <pre>${result.output}</pre>
                    </div>
                `;
            }
            
            resultContainer.innerHTML = resultHtml;
        } catch (error) {
            console.error('Knowledge workflow error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to execute knowledge workflow'}</p>`;
        }
    });

    // Agent Orchestration
    document.getElementById('agent-run').addEventListener('click', async function() {
        if (!openRouter) {
            showError('SDK Error', 'Please set your OpenRouter API key first');
            return;
        }

        const configJson = document.getElementById('agent-config').value.trim();
        
        if (!configJson) {
            alert('Please enter agent configuration');
            return;
        }
        
        let config;
        try {
            config = JSON.parse(configJson);
        } catch (error) {
            alert('Invalid JSON for agent configuration');
            return;
        }
        
        const resultContainer = document.getElementById('agent-result');
        resultContainer.innerHTML = '<div class="loading"></div>';
        
        try {
            // Create AIOrchestrator
            const orchestrator = new AIOrchestrator({
                apiKey: apiKey,
                defaultModel: 'anthropic/claude-3-opus'
            });
            
            // Create agents
            const agents = {};
            for (const agentConfig of config.agents) {
                const agent = orchestrator.createAgent(agentConfig);
                agents[agent.id] = agent;
            }
            
            // Create tasks
            const tasks = {};
            for (const taskConfig of config.tasks) {
                const task = orchestrator.createTask(taskConfig);
                tasks[task.id] = task;
            }
            
            // Create workflow
            const workflow = orchestrator.createWorkflow({
                id: config.workflow.id,
                name: config.workflow.name,
                tasks: Object.values(tasks),
                dependencies: config.workflow.dependencies
            });
            
            // Execute workflow
            resultContainer.innerHTML = '<p>Executing workflow... (this may take a while)</p>';
            const results = await orchestrator.executeWorkflow(workflow);
            
            // Display results
            let resultHtml = '<h4>Workflow Results:</h4>';
            
            for (const [taskId, result] of Object.entries(results)) {
                resultHtml += `
                    <div class="task-result">
                        <h5>Task: ${taskId}</h5>
                        <p><strong>Output:</strong></p>
                        <pre>${JSON.stringify(result.output, null, 2)}</pre>
                    </div>
                `;
            }
            
            resultContainer.innerHTML = resultHtml;
        } catch (error) {
            console.error('Agent orchestration error:', error);
            resultContainer.innerHTML = `<p class="error">Error: ${error.message || 'Failed to execute workflow'}</p>`;
        }
    });
});
