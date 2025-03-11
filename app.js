/**
 * OpenRouter SDK Demo Application
 * Client-side implementation showcasing OpenRouter SDK capabilities
 */

/**
 * Basic OpenRouter SDK Implementation
 * This provides a minimal implementation of the OpenRouter SDK for the demo to function.
 * In a real implementation, this would be imported from a proper SDK package.
 */
class OpenRouter {
  // Static cache of default models for fallback
  static DEFAULT_MODELS = [
    { id: 'openai/gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo' },
    { id: 'openai/gpt-4', provider: 'openai', name: 'GPT-4' },
    { id: 'openai/gpt-4-turbo', provider: 'openai', name: 'GPT-4 Turbo' },
    { id: 'openai/gpt-4o', provider: 'openai', name: 'GPT-4o' },
    { id: 'anthropic/claude-3-opus', provider: 'anthropic', name: 'Claude 3 Opus' },
    { id: 'anthropic/claude-3-sonnet', provider: 'anthropic', name: 'Claude 3 Sonnet' },
    { id: 'anthropic/claude-3-haiku', provider: 'anthropic', name: 'Claude 3 Haiku' },
    { id: 'google/gemini-pro', provider: 'google', name: 'Gemini Pro' },
    { id: 'google/gemini-1.5-pro', provider: 'google', name: 'Gemini 1.5 Pro' }
  ];
  
  constructor(config) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || 'openai/gpt-3.5-turbo';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 60000;
    this.debug = config.debug || false;
    
    // Cache for models
    this.modelsCache = null;
    
    if (this.debug) {
      console.log('OpenRouter SDK initialized with config:', {
        defaultModel: this.defaultModel,
        maxRetries: this.maxRetries,
        timeout: this.timeout
      });
    }
  }
  
  /**
   * List available models
   * @returns {Promise<Object>} Response with available models
   */
  async listModels() {
    try {
      const response = await fetch('https://api.openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'OpenRouter Agent Wizard'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return {
        data: data.data.map(model => ({
          id: model.id,
          provider: model.id.split('/')[0],
          name: model.name || model.id,
          context_length: model.context_length,
          pricing: model.pricing,
          description: model.description,
          top_provider: model.top_provider,
          capabilities: model.capabilities || []
        })),
        source: 'api'
      };
    } catch (error) {
      console.error('Error fetching models:', error);
      if (this.apiKey === 'demo-mode') {
        return {
          data: OpenRouter.DEFAULT_MODELS,
          source: 'default'
        };
      }
      throw error;
    }
  }

  
  /**
   * Refresh the models cache in the background without blocking the UI
   * @returns {Promise<void>}
   */
  async refreshModelsCache() {
    try {
      // Only make the API call if we have a real API key
      if (!this.apiKey || this.apiKey === 'demo-mode') {
        console.log('No API key available, not refreshing cache');
        return;
      }
      
      console.log('Refreshing models cache in background...');
      
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'OpenRouter SDK Demo'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        console.error(`API error (${response.status}): ${errorText}`);
        throw new Error(`Failed to refresh models: ${response.status} ${response.statusText}`);
      }
      
      const modelData = await response.json();
      
      if (!modelData.data || !Array.isArray(modelData.data)) {
        console.error('Invalid model data format received:', modelData);
        throw new Error('Invalid response format from API');
      }
      
      // Format and update the cache
      this.modelsCache = modelData.data.map(model => ({
        id: model.id,
        provider: model.id.split('/')[0] || 'unknown',
        name: model.name || model.id,
        context_length: model.context_length,
        pricing: model.pricing
      }));
      
      console.log(`Successfully refreshed cache with ${this.modelsCache.length} models`);
      
      // Dispatch an event to notify the UI that models have been refreshed
      if (typeof window !== 'undefined' && window.document) {
        const event = new CustomEvent('openrouter:modelsRefreshed', { 
          detail: { models: this.modelsCache }
        });
        window.document.dispatchEvent(event);
      }
      
      return this.modelsCache;
    } catch (error) {
      console.error('Error refreshing models cache:', error);
      // Keep using existing cache if refresh fails
      return null;
    }
  }
  
  /**
   * Save model preferences
   * @param {Object} preferences - Model preferences object
   * @returns {boolean} Success status
   */
  saveModelPreferences(preferences) {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, cannot save preferences');
        return false;
      }
      
      if (!preferences || typeof preferences !== 'object') {
        console.error('Invalid preferences object:', preferences);
        return false;
      }
      
      console.log('Saving model preferences:', preferences);
      localStorage.setItem('openrouter_model_preferences', JSON.stringify(preferences));
      
      // Verify the save was successful
      const saved = localStorage.getItem('openrouter_model_preferences');
      if (!saved) {
        console.error('Verification failed: preferences were not saved');
        return false;
      }
      
      // Dispatch event to notify components that preferences have changed
      if (typeof window !== 'undefined' && window.document) {
        const event = new CustomEvent('openrouter:preferencesChanged', { 
          detail: { preferences }
        });
        window.document.dispatchEvent(event);
      }
      
      console.log('Model preferences saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save model preferences:', error);
      return false;
    }
  }
  
  /**
   * Load model preferences
   * @returns {Object} Saved model preferences or default preferences
   */
  loadModelPreferences() {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, returning default preferences');
        return this.getDefaultPreferences();
      }
      
      console.log('Loading model preferences from localStorage...');
      const saved = localStorage.getItem('openrouter_model_preferences');
      
      if (saved) {
        const parsedPrefs = JSON.parse(saved);
        console.log('Loaded saved preferences:', parsedPrefs);
        return parsedPrefs;
      } else {
        console.log('No saved preferences found in localStorage');
      }
    } catch (error) {
      console.error('Failed to load model preferences:', error);
    }
    
    return this.getDefaultPreferences();
  }
  
  /**
   * Get default model preferences
   * @private
   * @returns {Object} Default model preferences
   */
  getDefaultPreferences() {
    const defaultPrefs = {
      chat: 'openai/gpt-3.5-turbo',
      researcher: 'anthropic/claude-3-opus',
      analyst: 'openai/gpt-4o'
    };
    
    console.log('Using default preferences:', defaultPrefs);
    return defaultPrefs;
  }
  
  /**
   * Create chat completion
   * @param {Object} params - Chat completion parameters
   * @returns {Promise<Object>} Chat completion response
   */
  /**
   * Create chat completion
   * @param {Object} params - Chat completion parameters
   * @returns {Promise<Object>} Chat completion response
   */
  async createChatCompletion(params) {
    try {
      const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'OpenRouter Agent Wizard'
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 1000,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Chat completion failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in chat completion:', error);
      throw error;
    }
  }

  /**
   * Create streaming chat completion
   * @param {Object} params - Chat completion parameters
   * @returns {ReadableStream} Stream of completion chunks
   */
  async createChatCompletionStream(params) {
    try {
      const response = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.href,
          'X-Title': 'OpenRouter Agent Wizard'
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature || 0.7,
          max_tokens: params.maxTokens || 1000,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Stream creation failed: ${response.status}`);
      }

      return response.body;
    } catch (error) {
      console.error('Error in stream creation:', error);
      throw error;
    }
  }
  
  /**
   * Create embeddings
   * @param {Object} params - Embedding parameters
   * @returns {Promise<Object>} Embedding response
   */
  async createEmbeddings(params) {
    if (this.debug) {
      console.log('Creating embeddings with params:', params);
    }
    
    // Generate mock embeddings
    const dimensions = 1536; // Most embedding models use 1536 dimensions
    const mockEmbeddings = Array.from({ length: dimensions }, () => (Math.random() * 2 - 1) / Math.sqrt(dimensions));
    
    return {
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: mockEmbeddings,
        index: 0
      }],
      model: params.model,
      usage: {
        prompt_tokens: params.input.length / 4,
        total_tokens: params.input.length / 4
      }
    };
  }
  
  /**
   * Create a vector database
   * @param {Object} params - Database creation parameters
   * @returns {Promise<Object>} Database creation response
   */
  async createVectorDB(params) {
    return {
      id: params.id,
      dimensions: params.dimensions,
      metric: params.metric || 'cosine',
      created: Date.now()
    };
  }
  
  /**
   * Add vectors to a vector database
   * @param {Object} params - Vector addition parameters
   * @returns {Promise<Object>} Vector addition response
   */
  async addVectors(params) {
    return {
      added: params.vectors.length,
      database_id: params.database_id
    };
  }
  
  /**
   * Query vectors in a vector database
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Query response
   */
  async queryVectors(params) {
    return {
      matches: [
        { id: 'vec1', score: 0.92, metadata: { text: 'Sample vector result 1' } },
        { id: 'vec2', score: 0.87, metadata: { text: 'Sample vector result 2' } },
        { id: 'vec3', score: 0.74, metadata: { text: 'Sample vector result 3' } }
      ],
      database_id: params.database_id
    };
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Initialize the chat interface
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const modelSelect = document.getElementById('model-select');
    const loadingElement = document.getElementById('loading');
    
    if (loadingElement) loadingElement.style.display = 'none';
    // Initialize chat functionality
    if (chatForm && chatMessages && messageInput && modelSelect) {
      // Setup the chat form submission
      chatForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        const model = modelSelect.value;
        
        if (!message) return;
        
        // Clear the input
        messageInput.value = '';
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Disable form while processing
        const submitBtn = chatForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Sending...';
        
        try {
          // Check if SDK is initialized
          if (!sdkInitialized || !openRouter) {
            throw new Error('OpenRouter SDK not initialized. Please add your API key first.');
          }
          
          // Add a loading message
          const loadingMsgId = 'loading-' + Date.now();
          addLoadingMessage(loadingMsgId);
          
          // Send message to the API
          const response = await openRouter.createCompletion({
            model: model,
            messages: [
              { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          // Remove loading message
          removeLoadingMessage(loadingMsgId);
          
          // Add assistant response to chat
          if (response && response.choices && response.choices[0]) {
            const assistantMessage = response.choices[0].message.content;
            addMessageToChat('assistant', assistantMessage);
          } else {
            throw new Error('Invalid response format from API');
          }
          
        } catch (error) {
          console.error('Chat error:', error);
          showError('Chat Error', error.message);
          // Remove loading message if it exists
          const loadingMsg = document.getElementById(loadingMsgId);
          if (loadingMsg) loadingMsg.remove();
        } finally {
          // Re-enable form
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send';
        }
      });
      
      // Helper function to add messages to the chat
      function addMessageToChat(role, content) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}-message`;
        
        const roleLabel = role === 'user' ? 'You' : 'Assistant';
        
        msgDiv.innerHTML = `
          <div class="message-header">
            <strong>${roleLabel}</strong>
          </div>
          <div class="message-content">${formatMessageContent(content)}</div>
        `;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
      // Helper function to format message content with Markdown-like syntax
      function formatMessageContent(content) {
        if (!content) return '';
        
        // Replace newlines with <br> tags
        let formatted = content.replace(/\n/g, '<br>');
        
        // Format code blocks
        formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        return formatted;
      }
      
      // Add loading message
      function addLoadingMessage(id) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message loading';
        loadingDiv.id = id;
        loadingDiv.innerHTML = `
          <div class="message-header">
            <strong>Assistant</strong>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        `;
        
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      
      // Remove loading message
      function removeLoadingMessage(id) {
        const loadingMsg = document.getElementById(id);
        if (loadingMsg) loadingMsg.remove();
      }
    }

    
    /**
     * API Key management with secure storage
     * Note: For production applications, consider using more secure storage methods
     * than localStorage, such as HTTP-only cookies, session storage with proper expiration,
     * or authenticated endpoints that handle the API key server-side
     */
    let apiKey = localStorage.getItem('openrouter_api_key') || 'demo-mode';
    if (!apiKey) {
      console.warn('No API key found in localStorage, using demo mode');
    }
    
    // SDK instance and state management
    let openRouter = null;
    // Messages array for API calls tracking
    let messagesHistory = [];
    let streamMessages = [];
    let vectorDbs = {};
    
    // Track initialization status
    let sdkInitialized = false;

    // Set API key in UI if available
    const apiKeyInput = document.getElementById('openrouter-api-key');
    const apiKeyForm = document.getElementById('api-key-form');
    const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
    const clearApiKeyBtn = document.getElementById('clear-api-key');
    const apiStatusEl = document.getElementById('api-status');
    
    // Set API key in form if available
    if (apiKey && apiKeyInput) {
        apiKeyInput.value = apiKey;
    }
    
    // Handle toggle key visibility
    if (toggleKeyVisibilityBtn) {
        toggleKeyVisibilityBtn.addEventListener('click', function() {
            if (apiKeyInput.type === 'password') {
                apiKeyInput.type = 'text';
                toggleKeyVisibilityBtn.innerHTML = '<i class="bi bi-eye-slash"></i> Hide';
            } else {
                apiKeyInput.type = 'password';
                toggleKeyVisibilityBtn.innerHTML = '<i class="bi bi-eye"></i> Show';
            }
        });
    }
    
    // Handle API key form submission
    if (apiKeyForm) {
        apiKeyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newApiKey = apiKeyInput.value.trim();
            
            if (!newApiKey) {
                showError('API Key Required', 'Please enter your OpenRouter API key');
                return;
            }
            
            // Save to localStorage
            localStorage.setItem('openrouter_api_key', newApiKey);
            apiKey = newApiKey;
            
            // Initialize the SDK with the new key
            initializeOpenRouter(apiKey).then(() => {
                showSuccess('API Key saved successfully!');
                updateStatusIndicators(true);
            }).catch(error => {
                showError('SDK Initialization Failed', error.message);
                updateStatusIndicators(false);
            });
        });
    }
    
    // Handle clear API key
    if (clearApiKeyBtn) {
        clearApiKeyBtn.addEventListener('click', function() {
            localStorage.removeItem('openrouter_api_key');
            apiKey = '';
            apiKeyInput.value = '';
            openRouter = null;
            sdkInitialized = false;
            updateStatusIndicators(false);
            showSuccess('API Key removed successfully');
        });
    }
    
    // Initialize the API status display
    if (apiStatusEl) {
        if (apiKey) {
            // Try to initialize with the saved key
            initializeOpenRouter(apiKey).then(() => {
                const maskedKey = maskApiKey(apiKey);
                apiStatusEl.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-success">Connected</span>
                        <span>Using API key: ${maskedKey}</span>
                    </div>
                `;
            }).catch(error => {
                apiStatusEl.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-danger">Error</span>
                        <span>API key invalid or expired. Please update your API key.</span>
                    </div>
                `;
            });
        } else {
            apiStatusEl.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-warning">Not Connected</span>
                    <span>No API key provided. Please enter your OpenRouter API key above.</span>
                </div>
            `;
        }
    }
    
    // Initialize OpenRouter with the API key if not already done in the status section
    if (apiKey && !sdkInitialized) {
        await initializeOpenRouter(apiKey);
    }

    /**
     * Additional API key validations
     * The main implementation is handled in the event listeners we defined above
     */

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
        const errorLog = document.getElementById('error-log');
        if (errorLog) {
            errorLog.innerHTML = `<strong>${title}</strong>: ${message}`;
            errorLog.style.display = 'block';
            // Auto-hide after specified duration
            setTimeout(() => {
                errorLog.style.display = 'none';
            }, duration);
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
        const successLog = document.getElementById('success-log');
        if (successLog) {
            successLog.innerHTML = message;
            successLog.style.display = 'block';
            // Auto-hide after specified duration
            setTimeout(() => {
                successLog.style.display = 'none';
            }, duration);
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
            if (typeof OpenRouter === 'undefined') {
                throw new Error('OpenRouter SDK not found. Make sure the script is loaded correctly.');
            }
            
            // Create SDK instance with configuration
            openRouter = new OpenRouter({
                apiKey: key,
                defaultModel: 'openai/gpt-3.5-turbo',
                maxRetries: 3,
                timeout: 60000,
                debug: false
            });
            
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
            console.error('Failed to initialize OpenRouter:', error);
            sdkInitialized = false;
            updateStatusIndicators(false);
            
            // Determine specific error type and show appropriate message
            let errorMessage = error.message || 'Unknown error occurred';
            if (error.status === 401) {
                errorMessage = 'The provided API key is invalid. Please check your key.';
            } else if (error.status === 403) {
                errorMessage = 'The API key does not have permission to access this resource.';
            } else if (error.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again later.';
            } else if (error.message && error.message.includes('timeout')) {
                errorMessage = 'Connection to OpenRouter timed out. Please try again.';
            } else if (error.message && error.message.includes('network')) {
                errorMessage = 'Network connection error. Please check your internet connection.';
            }
            
            showError('SDK Initialization Failed', errorMessage);
            throw error; // Re-throw to be caught by outer handlers
        }
    }
    /**
     * Populates model selection dropdowns with available models
     * 
     * @param {Array} models - Array of model objects containing id, name, and pricing info
     */
    function populateModelDropdowns(models) {
        if (!Array.isArray(models) || models.length === 0) {
            console.warn('No models available to populate dropdowns');
            return;
        }
        
        // Get all model select dropdowns
        const modelSelects = document.querySelectorAll('select[id$="-model"]');
        
        modelSelects.forEach(select => {
            if (!select) return;
            
            // Store current selection if any
            const currentSelection = select.value;
            
            // Clear existing options except the default/first option
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // Add models as options
            models.forEach(model => {
                if (!model.id) return;
                
                const option = document.createElement('option');
                option.value = model.id;
                
                // Create descriptive label including pricing if available
                let label = model.id;
                if (model.pricing) {
                    label += ` - $${model.pricing.prompt}/1M in, $${model.pricing.completion}/1M out`;
                }
                option.textContent = label;
                
                select.appendChild(option);
                
                // Restore previous selection if it matches
                if (model.id === currentSelection) {
                    select.value = model.id;
                }
            });
            
            // Set first model as default if no previous selection
            if (!currentSelection && select.options.length > 0) {
                select.selectedIndex = 0;
            }
        });
    }
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    showError('Initialization Error', 'Failed to initialize application. Please try refreshing the page.');
    return Promise.reject(error);
  }
});
