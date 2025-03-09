document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let apiKey = localStorage.getItem('openrouter_api_key') || '';
    let openRouter = null;
    let chatMessages = [];
    let streamMessages = [];
    let vectorDbs = {};

    // Set API key if available
    const apiKeyInput = document.getElementById('api-key');
    apiKeyInput.value = apiKey;

    // Initialize OpenRouter if API key is available
    if (apiKey) {
        initializeOpenRouter(apiKey);
    }

    // Save API key
    document.getElementById('save-api-key').addEventListener('click', function() {
        const newApiKey = apiKeyInput.value.trim();
        if (newApiKey) {
            apiKey = newApiKey;
            localStorage.setItem('openrouter_api_key', apiKey);
            initializeOpenRouter(apiKey);
            alert('API key saved successfully!');
        } else {
            alert('Please enter a valid API key');
        }
    });

    // Initialize OpenRouter SDK
    function initializeOpenRouter(key) {
        try {
            // This assumes the OpenRouter SDK is available as a global variable
            // In a real implementation, you would import it properly
            // Check if the SDK is available in the global scope
            if (typeof OpenRouter !== 'undefined') {
                openRouter = new OpenRouter({
                    apiKey: key,
                    defaultModel: 'openai/gpt-3.5-turbo'
                });
            } else {
                console.error('OpenRouter SDK not found. Make sure the script is loaded correctly.');
                alert('OpenRouter SDK not found. Make sure the script is loaded correctly.');
            }
        } catch (error) {
            console.error('Failed to initialize OpenRouter:', error);
            alert('Failed to initialize OpenRouter SDK. Check console for details.');
        }
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

    // Chat Completions
    document.getElementById('chat-send').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    async function sendChatMessage() {
        if (!openRouter) {
            alert('Please set your OpenRouter API key first');
            return;
        }

        const chatInput = document.getElementById('chat-input');
        const userMessage = chatInput.value.trim();
        
        if (!userMessage) return;
        
        // Clear input
        chatInput.value = '';
        
        // Get chat settings
        const model = document.getElementById('chat-model').value;
        const temperature = parseFloat(document.getElementById('chat-temperature').value);
        const maxTokens = parseInt(document.getElementById('chat-max-tokens').value);
        const systemMessage = document.getElementById('chat-system-message').value.trim();
        
        // Add system message if provided and not already added
        if (systemMessage && !chatMessages.some(msg => msg.role === 'system')) {
            chatMessages.push({ role: 'system', content: systemMessage });
        }
        
        // Add user message
        chatMessages.push({ role: 'user', content: userMessage });
        
        // Update chat UI
        updateChatUI('chat-messages', chatMessages);
        
        try {
            // Add loading indicator
            const messagesContainer = document.getElementById('chat-messages');
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message-container loading-container';
            loadingDiv.innerHTML = '<div class="message-header assistant-header">Assistant</div><div class="message assistant-message"><div class="loading"></div></div>';
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Send request to OpenRouter
            const response = await openRouter.createChatCompletion({
                model: model,
                messages: chatMessages,
                temperature: temperature,
                max_tokens: maxTokens
            });
            
            // Remove loading indicator
            messagesContainer.removeChild(loadingDiv);
            
            // Add assistant response
            const assistantMessage = response.choices[0].message;
            chatMessages.push(assistantMessage);
            
            // Update chat UI
            updateChatUI('chat-messages', chatMessages);
            
        } catch (error) {
            console.error('Chat completion error:', error);
            alert(`Error: ${error.message || 'Failed to get response'}`);
        }
    }

    // Streaming Chat
    document.getElementById('stream-send').addEventListener('click', sendStreamMessage);
    document.getElementById('stream-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendStreamMessage();
        }
    });

    async function sendStreamMessage() {
        if (!openRouter) {
            alert('Please set your OpenRouter API key first');
            return;
        }

        const streamInput = document.getElementById('stream-input');
        const userMessage = streamInput.value.trim();
        
        if (!userMessage) return;
        
        // Clear input
        streamInput.value = '';
        
        // Get stream settings
        const model = document.getElementById('stream-model').value;
        const temperature = parseFloat(document.getElementById('stream-temperature').value);
        const maxTokens = parseInt(document.getElementById('stream-max-tokens').value);
        const systemMessage = document.getElementById('stream-system-message').value.trim();
        
        // Add system message if provided and not already added
        if (systemMessage && !streamMessages.some(msg => msg.role === 'system')) {
            streamMessages.push({ role: 'system', content: systemMessage });
        }
        
        // Add user message
        streamMessages.push({ role: 'user', content: userMessage });
        
        // Update stream UI
        updateChatUI('stream-messages', streamMessages);
        
        try {
            // Create streaming response container
            const messagesContainer = document.getElementById('stream-messages');
            const streamContainer = document.createElement('div');
            streamContainer.className = 'message-container';
            streamContainer.innerHTML = '<div class="message-header assistant-header">Assistant</div><div class="message assistant-message" id="current-stream"></div>';
            messagesContainer.appendChild(streamContainer);
            
            const streamElement = document.getElementById('current-stream');
            let streamContent = '';
            
            // Stream response from OpenRouter
            for await (const chunk of openRouter.streamChatCompletions({
                model: model,
                messages: streamMessages,
                temperature: temperature,
                max_tokens: maxTokens
            })) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content) {
                    streamContent += content;
                    streamElement.textContent = streamContent;
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }
            
            // Add completed message to messages array
            streamMessages.push({ role: 'assistant', content: streamContent });
            
            // Remove stream element ID to prevent duplicates
            streamElement.removeAttribute('id');
            
        } catch (error) {
            console.error('Stream chat error:', error);
            alert(`Error: ${error.message || 'Failed to get streaming response'}`);
        }
    }

    // Update chat UI
    function updateChatUI(containerId, messages) {
        const container = document.getElementById(containerId);
        
        // Clear container
        container.innerHTML = '';
        
        // Add messages
        messages.forEach(message => {
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
                messageDiv.textContent = message.content;
                
                messageContainer.appendChild(header);
                messageContainer.appendChild(messageDiv);
                container.appendChild(messageContainer);
            }
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    // Embeddings
    document.getElementById('embedding-generate').addEventListener('click', async function() {
        if (!openRouter) {
            alert('Please set your OpenRouter API key first');
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
            alert('Please set your OpenRouter API key first');
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
            alert('Please set your OpenRouter API key first');
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
            alert('Please set your OpenRouter API key first');
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
            alert('Please set your OpenRouter API key first');
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
            alert('Please set your OpenRouter API key first');
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
