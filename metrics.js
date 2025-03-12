/**
 * OneAPI Metrics Dashboard Module
 * Visualizes usage metrics across different providers integrated with OneAPI
 */

class MetricsDashboard {
    constructor() {
        this.oneApiClient = new OneAPIClient();
        this.providerChart = null;
        this.initEventListeners();
        this.providerColors = {
            'openai': '#10a37f',
            'anthropic': '#d878ff',
            'mistral': '#0ac2ff',
            'google': '#4285f4',
            'together': '#6b3fac',
            'default': '#6c757d'
        };
    }

    initEventListeners() {
        // Attach event listeners once DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            // Refresh metrics when tab is clicked
            const metricsTabLink = document.getElementById('metrics-tab-link');
            if (metricsTabLink) {
                metricsTabLink.addEventListener('click', () => this.loadMetrics());
            }

            // Refresh button
            const refreshButton = document.getElementById('refresh-metrics');
            if (refreshButton) {
                refreshButton.addEventListener('click', () => this.loadMetrics());
            }

            // Export button
            const exportButton = document.getElementById('export-metrics');
            if (exportButton) {
                exportButton.addEventListener('click', () => this.exportMetrics());
            }
        });
    }

    async loadMetrics() {
        try {
            this.showLoading();
            
            // Fetch metrics data from OneAPI
            const metrics = await this.oneApiClient.getMetrics();
            
            // Update dashboard with metrics data
            this.updateDashboardData(metrics);
            
            // Load recent operations
            await this.loadRecentOperations();
            
            // Load error log
            await this.loadErrorLog();
            
            this.hideLoading();
        } catch (error) {
            console.error('Error loading metrics:', error);
            this.displayErrorNotification('Failed to load metrics data');
            this.hideLoading();
        }
    }

    showLoading() {
        // Show loading indicators on the metrics dashboard
        const elements = ['total-requests', 'input-tokens', 'output-tokens', 'avg-response-time'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            }
        });
    }

    hideLoading() {
        // Remove loading indicators
    }

    updateDashboardData(metrics) {
        // Update overview cards
        this.updateOverviewMetrics(metrics);
        
        // Update provider metrics table
        this.updateProviderMetricsTable(metrics.providers);
        
        // Update provider metrics chart
        this.updateProviderChart(metrics.providers);
    }

    updateOverviewMetrics(metrics) {
        // Update the top metrics cards with overall statistics
        const totalRequests = document.getElementById('total-requests');
        const inputTokens = document.getElementById('input-tokens');
        const outputTokens = document.getElementById('output-tokens');
        const avgResponseTime = document.getElementById('avg-response-time');

        if (totalRequests) totalRequests.textContent = metrics.totalRequests.toLocaleString();
        if (inputTokens) inputTokens.textContent = metrics.inputTokens.toLocaleString();
        if (outputTokens) outputTokens.textContent = metrics.outputTokens.toLocaleString();
        if (avgResponseTime) avgResponseTime.textContent = `${metrics.avgResponseTime.toFixed(0)}ms`;
    }

    updateProviderMetricsTable(providers) {
        const tableBody = document.querySelector('#provider-metrics-table tbody');
        if (!tableBody) return;

        // Clear existing rows
        tableBody.innerHTML = '';

        // Add a row for each provider
        providers.forEach(provider => {
            const row = document.createElement('tr');
            
            // Determine a friendly provider name
            const providerName = this.getProviderDisplayName(provider.id);
            
            // Create provider badge with color
            const badge = this.createProviderBadge(provider.id, providerName);
            
            row.innerHTML = `
                <td>${badge}</td>
                <td>${provider.requests.toLocaleString()}</td>
                <td>${provider.inputTokens.toLocaleString()}</td>
                <td>${provider.outputTokens.toLocaleString()}</td>
                <td>${provider.avgResponseTime.toFixed(0)}ms</td>
                <td>${provider.successRate.toFixed(1)}%</td>
            `;
            
            tableBody.appendChild(row);
        });
    }

    createProviderBadge(providerId, displayName) {
        const color = this.providerColors[providerId] || this.providerColors.default;
        return `<span class="badge" style="background-color: ${color};">${displayName}</span>`;
    }

    getProviderDisplayName(providerId) {
        const nameMap = {
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'google': 'Google Gemini',
            'mistral': 'Mistral',
            'together': 'Together'
        };
        return nameMap[providerId] || providerId.charAt(0).toUpperCase() + providerId.slice(1);
    }

    updateProviderChart(providers) {
        const chartCanvas = document.getElementById('provider-metrics-chart');
        if (!chartCanvas) return;

        // Prepare data for the chart
        const labels = providers.map(p => this.getProviderDisplayName(p.id));
        const requestsData = providers.map(p => p.requests);
        const inputTokensData = providers.map(p => p.inputTokens);
        const outputTokensData = providers.map(p => p.outputTokens);
        const backgroundColors = providers.map(p => this.providerColors[p.id] || this.providerColors.default);

        // If chart already exists, destroy it
        if (this.providerChart) {
            this.providerChart.destroy();
        }

        // Create new chart
        this.providerChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Requests',
                        data: requestsData,
                        backgroundColor: backgroundColors.map(color => `${color}aa`),
                        borderColor: backgroundColors,
                        borderWidth: 1
                    },
                    {
                        label: 'Input Tokens',
                        data: inputTokensData,
                        backgroundColor: backgroundColors.map(color => `${color}66`),
                        borderColor: backgroundColors,
                        borderWidth: 1
                    },
                    {
                        label: 'Output Tokens',
                        data: outputTokensData,
                        backgroundColor: backgroundColors.map(color => `${color}33`),
                        borderColor: backgroundColors,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    async loadRecentOperations() {
        try {
            const operations = await this.oneApiClient.getRecentOperations();
            const containerEl = document.getElementById('recent-operations');
            
            if (!containerEl) return;
            
            // Clear existing content
            containerEl.innerHTML = '';
            
            if (operations.length === 0) {
                containerEl.innerHTML = `
                    <div class="empty-state p-4 text-center text-muted">
                        <i class="bi bi-clock-history d-block mb-3" style="font-size: 2rem;"></i>
                        <p>No recent operations to display</p>
                    </div>
                `;
                return;
            }
            
            // Add each operation to the list
            operations.forEach(op => {
                const timeAgo = this.timeAgo(new Date(op.timestamp));
                const operationItem = document.createElement('div');
                operationItem.className = 'list-group-item';
                
                const badge = this.createProviderBadge(op.provider, this.getProviderDisplayName(op.provider));
                
                operationItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <p class="mb-0 fw-medium">${op.operation} ${badge}</p>
                            <small class="text-muted">
                                <span class="me-2"><i class="bi bi-input-cursor-text me-1"></i>${op.inputTokens} tokens</span>
                                <span class="me-2"><i class="bi bi-output me-1"></i>${op.outputTokens} tokens</span>
                                <span><i class="bi bi-clock me-1"></i>${op.duration}ms</span>
                            </small>
                        </div>
                        <small class="text-nowrap text-muted">${timeAgo}</small>
                    </div>
                `;
                
                containerEl.appendChild(operationItem);
            });
            
        } catch (error) {
            console.error('Error loading recent operations:', error);
        }
    }

    async loadErrorLog() {
        try {
            const errors = await this.oneApiClient.getErrors();
            const containerEl = document.getElementById('error-log');
            
            if (!containerEl) return;
            
            // Clear existing content
            containerEl.innerHTML = '';
            
            if (errors.length === 0) {
                containerEl.innerHTML = `
                    <div class="empty-state p-4 text-center text-muted">
                        <i class="bi bi-exclamation-triangle d-block mb-3" style="font-size: 2rem;"></i>
                        <p>No errors recorded</p>
                    </div>
                `;
                return;
            }
            
            // Add each error to the list
            errors.forEach(error => {
                const timeAgo = this.timeAgo(new Date(error.timestamp));
                const errorItem = document.createElement('div');
                errorItem.className = 'list-group-item';
                
                const badge = this.createProviderBadge(error.provider, this.getProviderDisplayName(error.provider));
                
                errorItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div class="d-flex align-items-center">
                            <span class="badge bg-danger me-2">${error.code || 'Error'}</span>
                            ${badge}
                        </div>
                        <small class="text-nowrap text-muted">${timeAgo}</small>
                    </div>
                    <p class="mb-0 small">${error.message}</p>
                `;
                
                containerEl.appendChild(errorItem);
            });
            
        } catch (error) {
            console.error('Error loading error log:', error);
        }
    }

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
      
        let interval = Math.floor(seconds / 31536000);
        if (interval > 1) return interval + ' years ago';
        if (interval === 1) return '1 year ago';
      
        interval = Math.floor(seconds / 2592000);
        if (interval > 1) return interval + ' months ago';
        if (interval === 1) return '1 month ago';
      
        interval = Math.floor(seconds / 86400);
        if (interval > 1) return interval + ' days ago';
        if (interval === 1) return '1 day ago';
      
        interval = Math.floor(seconds / 3600);
        if (interval > 1) return interval + ' hours ago';
        if (interval === 1) return '1 hour ago';
      
        interval = Math.floor(seconds / 60);
        if (interval > 1) return interval + ' minutes ago';
        if (interval === 1) return '1 minute ago';
      
        if (seconds <= 5) return 'just now';
        return Math.floor(seconds) + ' seconds ago';
    }

    exportMetrics() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `openrouter-metrics-${timestamp}.json`;
            
            // Get metrics data
            this.oneApiClient.getMetrics().then(metrics => {
                // Create a JSON file for download
                const dataStr = JSON.stringify(metrics, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                // Create a download link and trigger it
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(dataBlob);
                downloadLink.download = filename;
                downloadLink.click();
                
                // Display success notification
                this.displaySuccessNotification('Metrics data exported successfully');
            });
        } catch (error) {
            console.error('Error exporting metrics:', error);
            this.displayErrorNotification('Failed to export metrics data');
        }
    }

    displaySuccessNotification(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('id', toastId);
        
        toast.innerHTML = `
            <div class="toast-header bg-success text-white">
                <i class="bi bi-check-circle-fill me-2"></i>
                <strong class="me-auto">Success</strong>
                <small>just now</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    displayErrorNotification(message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.setAttribute('id', toastId);
        
        toast.innerHTML = `
            <div class="toast-header bg-danger text-white">
                <i class="bi bi-exclamation-circle-fill me-2"></i>
                <strong class="me-auto">Error</strong>
                <small>just now</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
}

// Mock data for testing purposes
// In a real implementation, this would come from the OneAPI client
OneAPIClient.prototype.getMetrics = async function() {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
    "totalRequests": 3427,
    "inputTokens": 2218560,
    "outputTokens": 642980,
    "avgResponseTime": 453,
    "providers": [
        {
            "id": "openai",
            "requests": 1482,
            "inputTokens": 1025250,
            "outputTokens": 298840,
            "avgResponseTime": 382,
            "successRate": 99.7
        },
        {
            "id": "anthropic",
            "requests": 846,
            "inputTokens": 782750,
            "outputTokens": 219240,
            "avgResponseTime": 512,
            "successRate": 98.9
        },
        {
            "id": "google",
            "requests": 524,
            "inputTokens": 247820,
            "outputTokens": 78460,
            "avgResponseTime": 327,
            "successRate": 99.4
        },
        {
            "id": "mistral",
            "requests": 427,
            "inputTokens": 129800,
            "outputTokens": 39940,
            "avgResponseTime": 378,
            "successRate": 97.8
        },
        {
            "id": "together",
            "requests": 148,
            "inputTokens": 32940,
            "outputTokens": 6500,
            "avgResponseTime": 468,
            "successRate": 95.2
        }
    ],
    "recentOperations": [
        {
            "id": "op-1741741905180-0",
            "type": "embedding",
            "provider": "mistral",
            "model": "mistral/mistral-medium",
            "status": "success",
            "timestamp": "2025-03-12T00:51:59.091Z",
            "details": {
                "inputTokens": 1041,
                "outputTokens": 883,
                "processingTime": 769,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-1",
            "type": "embedding",
            "provider": "anthropic",
            "model": "openai/gpt-4-turbo",
            "status": "error",
            "timestamp": "2025-03-12T01:08:25.469Z",
            "details": {
                "inputTokens": 1220,
                "outputTokens": 589,
                "processingTime": 825,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-2",
            "type": "chat",
            "provider": "openai",
            "model": "mistral/mistral-medium",
            "status": "success",
            "timestamp": "2025-03-12T00:02:32.095Z",
            "details": {
                "inputTokens": 501,
                "outputTokens": 1047,
                "processingTime": 555,
                "prompt": "User query about machine learning"
            }
        },
        {
            "id": "op-1741741905180-3",
            "type": "embedding",
            "provider": "mistral",
            "model": "anthropic/claude-3-opus",
            "status": "success",
            "timestamp": "2025-03-12T00:28:33.383Z",
            "details": {
                "inputTokens": 743,
                "outputTokens": 830,
                "processingTime": 628,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-4",
            "type": "chat",
            "provider": "openai",
            "model": "google/gemini-pro",
            "status": "success",
            "timestamp": "2025-03-11T23:24:17.227Z",
            "details": {
                "inputTokens": 1893,
                "outputTokens": 200,
                "processingTime": 874,
                "prompt": "User query about machine learning"
            }
        },
        {
            "id": "op-1741741905180-5",
            "type": "embedding",
            "provider": "google",
            "model": "openai/gpt-4-turbo",
            "status": "success",
            "timestamp": "2025-03-11T23:12:07.574Z",
            "details": {
                "inputTokens": 914,
                "outputTokens": 839,
                "processingTime": 596,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-6",
            "type": "chat",
            "provider": "openai",
            "model": "anthropic/claude-3-opus",
            "status": "success",
            "timestamp": "2025-03-12T01:04:26.020Z",
            "details": {
                "inputTokens": 1444,
                "outputTokens": 454,
                "processingTime": 411,
                "prompt": "User query about language models"
            }
        },
        {
            "id": "op-1741741905180-7",
            "type": "chat",
            "provider": "mistral",
            "model": "openai/gpt-4-turbo",
            "status": "error",
            "timestamp": "2025-03-11T23:40:51.279Z",
            "details": {
                "inputTokens": 1332,
                "outputTokens": 940,
                "processingTime": 837,
                "prompt": "User query about language models"
            }
        },
        {
            "id": "op-1741741905180-8",
            "type": "embedding",
            "provider": "openai",
            "model": "google/gemini-pro",
            "status": "success",
            "timestamp": "2025-03-12T00:56:40.801Z",
            "details": {
                "inputTokens": 581,
                "outputTokens": 368,
                "processingTime": 585,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-9",
            "type": "embedding",
            "provider": "anthropic",
            "model": "together/llama-3-70b-instruct",
            "status": "success",
            "timestamp": "2025-03-11T23:43:02.686Z",
            "details": {
                "inputTokens": 1138,
                "outputTokens": 1043,
                "processingTime": 491,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-10",
            "type": "chat",
            "provider": "google",
            "model": "openai/gpt-4-turbo",
            "status": "error",
            "timestamp": "2025-03-12T00:53:29.914Z",
            "details": {
                "inputTokens": 1067,
                "outputTokens": 98,
                "processingTime": 764,
                "prompt": "User query about data processing"
            }
        },
        {
            "id": "op-1741741905180-11",
            "type": "embedding",
            "provider": "together",
            "model": "anthropic/claude-3-opus",
            "status": "success",
            "timestamp": "2025-03-12T00:38:33.475Z",
            "details": {
                "inputTokens": 1683,
                "outputTokens": 994,
                "processingTime": 949,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-12",
            "type": "chat",
            "provider": "mistral",
            "model": "mistral/mistral-medium",
            "status": "success",
            "timestamp": "2025-03-11T23:48:15.535Z",
            "details": {
                "inputTokens": 381,
                "outputTokens": 174,
                "processingTime": 777,
                "prompt": "User query about language models"
            }
        },
        {
            "id": "op-1741741905180-13",
            "type": "embedding",
            "provider": "mistral",
            "model": "together/llama-3-70b-instruct",
            "status": "error",
            "timestamp": "2025-03-12T00:46:54.693Z",
            "details": {
                "inputTokens": 1180,
                "outputTokens": 255,
                "processingTime": 726,
                "prompt": null
            }
        },
        {
            "id": "op-1741741905180-14",
            "type": "chat",
            "provider": "google",
            "model": "google/gemini-pro",
            "status": "error",
            "timestamp": "2025-03-11T23:44:40.770Z",
            "details": {
                "inputTokens": 1317,
                "outputTokens": 184,
                "processingTime": 870,
                "prompt": "User query about language models"
            }
        }
    ],
    "errors": [
        {
            "id": "err-1741741905180-0",
            "provider": "anthropic",
            "type": "rate_limit_exceeded",
            "message": "You exceeded your current quota, please check your plan and billing details.",
            "timestamp": "2025-03-09T12:53:17.210Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-1",
            "provider": "openai",
            "type": "rate_limit_exceeded",
            "message": "You exceeded your current quota, please check your plan and billing details.",
            "timestamp": "2025-03-10T08:26:49.184Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-2",
            "provider": "mistral",
            "type": "server_error",
            "message": "The server had an error while processing your request.",
            "timestamp": "2025-03-10T19:02:53.566Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-3",
            "provider": "together",
            "type": "invalid_request_error",
            "message": "The model does not exist or you do not have access to it.",
            "timestamp": "2025-03-09T19:27:25.432Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-4",
            "provider": "anthropic",
            "type": "invalid_request_error",
            "message": "The model does not exist or you do not have access to it.",
            "timestamp": "2025-03-10T18:10:55.173Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-5",
            "provider": "anthropic",
            "type": "rate_limit_exceeded",
            "message": "You exceeded your current quota, please check your plan and billing details.",
            "timestamp": "2025-03-10T04:45:54.913Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-6",
            "provider": "anthropic",
            "type": "server_error",
            "message": "The server had an error while processing your request.",
            "timestamp": "2025-03-11T19:13:09.200Z",
            "resolved": false
        },
        {
            "id": "err-1741741905180-7",
            "provider": "anthropic",
            "type": "authentication_error",
            "message": "Invalid Authentication: Incorrect API key provided.",
            "timestamp": "2025-03-11T20:56:24.409Z",
            "resolved": true
        }
    ]
};
};

OneAPIClient.prototype.getRecentOperations = async function() {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
        {
            operation: 'Chat Completion',
            provider: 'openai',
            model: 'gpt-4-turbo',
            inputTokens: 1580,
            outputTokens: 420,
            duration: 2845,
            timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString() // 3 minutes ago
        },
        {
            operation: 'Chat Completion',
            provider: 'anthropic',
            model: 'claude-3-opus',
            inputTokens: 2450,
            outputTokens: 870,
            duration: 4210,
            timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString() // 12 minutes ago
        },
        {
            operation: 'Embedding',
            provider: 'openai',
            model: 'text-embedding-3-large',
            inputTokens: 1240,
            outputTokens: 0,
            duration: 520,
            timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() // 25 minutes ago
        },
        {
            operation: 'Chat Completion',
            provider: 'mistral',
            model: 'mistral-large',
            inputTokens: 950,
            outputTokens: 320,
            duration: 1840,
            timestamp: new Date(Date.now() - 1.2 * 60 * 60 * 1000).toISOString() // ~1 hour ago
        },
        {
            operation: 'Chat Completion',
            provider: 'google',
            model: 'gemini-1.5-pro',
            inputTokens: 1820,
            outputTokens: 650,
            duration: 2180,
            timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString() // 2.5 hours ago
        }
    ];
};

OneAPIClient.prototype.getErrors = async function() {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
        {
            provider: 'anthropic',
            model: 'claude-3-opus',
            code: 'context_length_exceeded',
            message: 'This model can accept at most 200K tokens of input.',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 minutes ago
        },
        {
            provider: 'together',
            model: 'llama-3-70b',
            code: 'rate_limit_exceeded',
            message: 'You have exceeded your rate limit. Please try again later.',
            timestamp: new Date(Date.now() - 3.2 * 60 * 60 * 1000).toISOString() // ~3 hours ago
        },
        {
            provider: 'openai',
            model: 'gpt-4-turbo',
            code: 'invalid_request_error',
            message: 'The model gpt-4-vision-preview does not exist or you do not have access to it.',
            timestamp: new Date(Date.now() - 6.5 * 60 * 60 * 1000).toISOString() // 6.5 hours ago
        }
    ];
};

// Initialize the dashboard
const metricsDashboard = new MetricsDashboard();
