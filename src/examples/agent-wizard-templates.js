export const TEMPLATES = {
    research: {
        basics: {
            name: 'Research Agent',
            description: 'Performs web research and synthesizes information from multiple sources',
            type: 'researcher'
        },
        capabilities: {
            tools: 'web_search,data_analysis',
            memory: 'long_term',
            model: 'gpt-4'
        },
        behavior: {
            personality: 'professional',
            autonomy: '4',
            responseStyle: 'analytical,detailed'
        },
        integration: {
            inputs: '[{"name":"topic","type":"string","description":"Research topic"}]',
            outputs: '[{"format":"markdown","schema":"summary","sample":"## Research Summary..."}]',
            triggers: '[{"event":"new_topic","condition":"topic.length > 0","action":"start_research"}]'
        },
        testing: {
            testCases: '[{"input":"AI trends 2025","expectedOutput":"Comprehensive analysis","description":"Basic research test"}]',
            successCriteria: 'Minimum 3 credible sources cited',
            fallbackBehavior: 'Return available partial results with sources'
        }
    },
    analysis: {
        basics: {
            name: 'Analysis Agent',
            description: 'Analyzes data and generates insights with visualizations',
            type: 'analyst'
        },
        capabilities: {
            tools: 'data_analysis',
            memory: 'short_term',
            model: 'gpt-4'
        },
        behavior: {
            personality: 'professional',
            autonomy: '3',
            responseStyle: 'analytical'
        },
        integration: {
            inputs: '[{"name":"data","type":"json","description":"Raw data for analysis"}]',
            outputs: '[{"format":"json","schema":"analysis_result","sample":"{\\"insights\\":[...]}"}]',
            triggers: '[{"event":"new_data","condition":"data.length > 0","action":"analyze"}]'
        },
        testing: {
            testCases: '[{"input":"sample_data.json","expectedOutput":"3 key insights","description":"Basic analysis test"}]',
            successCriteria: 'Minimum 2 actionable insights',
            fallbackBehavior: 'Return basic statistical analysis'
        }
    },
    assistant: {
        basics: {
            name: 'Conversational Assistant',
            description: 'Maintains context and provides helpful responses',
            type: 'assistant'
        },
        capabilities: {
            tools: 'file_access',
            memory: 'long_term',
            model: 'claude-3'
        },
        behavior: {
            personality: 'friendly',
            autonomy: '2',
            responseStyle: 'conversational'
        },
        integration: {
            inputs: '[{"name":"message","type":"string","description":"User message"}]',
            outputs: '[{"format":"string","schema":"response","sample":"I understand you need help with..."}]',
            triggers: '[{"event":"new_message","condition":"true","action":"respond"}]'
        },
        testing: {
            testCases: '[{"input":"Hello","expectedOutput":"Friendly greeting","description":"Basic greeting test"}]',
            successCriteria: 'Maintains context for 5+ turns',
            fallbackBehavior: 'Graceful context reset'
        }
    },
    custom: {
        basics: {
            name: '',
            description: '',
            type: 'executor'
        },
        capabilities: {
            tools: '',
            memory: 'short_term',
            model: 'gpt-3.5'
        },
        behavior: {
            personality: 'professional',
            autonomy: '3',
            responseStyle: ''
        },
        integration: {
            inputs: '[]',
            outputs: '[]',
            triggers: '[]'
        },
        testing: {
            testCases: '[]',
            successCriteria: '',
            fallbackBehavior: ''
        }
    }
};
