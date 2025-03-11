# Agent Wizard

A step-by-step interface for building and orchestrating AI agents. Create, configure, and connect AI agents through an intuitive wizard interface.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript files:
```bash
npm run build
```

3. Start the server:
```bash
npm start
```

4. Visit http://localhost:3000

## Building Agents

The wizard guides you through 5 steps to create an agent:

1. Basic Configuration
   - Name your agent
   - Describe its purpose
   - Choose agent type (researcher/analyst/assistant/executor)

2. Capabilities
   - Select available tools (web search, file access, etc.)
   - Choose memory type (none/short-term/long-term)
   - Pick language model (GPT-3.5/GPT-4/Claude-3)

3. Behavior Configuration
   - Set personality type (professional/friendly/direct)
   - Configure autonomy level (1-5)
   - Define response style (concise/detailed/analytical)

4. Integration Setup
   - Define input/output formats
   - Set up triggers and event handlers
   - Configure data transformations

5. Testing & Validation
   - Add test cases
   - Define success criteria
   - Set fallback behavior

## Development

For development with auto-reload:
```bash
npm run dev
```

Watch TypeScript files:
```bash
npm run build:watch
```

## File Structure

```
├── src/
│   ├── utils/
│   │   ├── agent-wizard.js      # Core wizard functionality
│   │   └── function-wizard.js   # Function building utilities
│   │
│   ├── examples/
│   │   ├── wizard-dashboard.html # Main wizard interface
│   │   ├── server.js            # Development server
│   │   └── agent-templates.js   # Pre-built agent templates
│   │
│   └── types/                   # TypeScript definitions
│
├── start.sh        # Quick start script for macOS/Linux
├── start.bat      # Quick start script for Windows
├── package.json   # Project configuration
└── tsconfig.json  # TypeScript configuration
```

## Creating Agent Templates

Create new agent templates in `src/examples/agent-wizard-templates.js`:

```javascript
wizard.defineFunction('customAgent')
  .description('Your custom agent')
  .parameter('input', 'string', 'Input data', true)
  .parameter('options', 'object', 'Configuration options', false)
  .implement(async ({ input, options = {} }) => {
    // Agent implementation
    const result = await processInput(input, options);
    return result;
  })
  .register();
```

## Orchestrating Agents

Connect multiple agents in a workflow:

```javascript
const workflow = wizard.createWorkflow('myWorkflow', 'Research and Analysis', [
  {
    source: 'researchAgent',
    target: 'analysisAgent',
    config: {
      transformation: {
        rules: [
          {
            condition: data => Boolean(data),
            transform: data => ({ analysis: data })
          }
        ]
      }
    }
  }
]);

// Execute workflow
const results = await wizard.executeWorkflow('myWorkflow', {
  topic: 'AI trends in 2025'
});
```

## Error Handling

The wizard includes built-in error handling and logging:
- Invalid configurations are caught early
- Runtime errors are logged with full context
- Fallback behaviors can be defined per agent
- Workflow errors include full execution trace

## Customization

Extend the wizard by:
1. Adding new agent types in `agent-wizard.js`
2. Creating custom templates in `agent-templates.js`
3. Defining new field types in `wizard-dashboard.html`
4. Adding workflow patterns in function implementations

### Example: Adding a New Agent Type

```javascript
// In agent-wizard.js
class CustomAgentType extends BaseAgent {
  constructor(config) {
    super(config);
    this.customFeature = config.customFeature;
  }

  async execute(input) {
    // Custom implementation
    return result;
  }
}

// Register the new type
AgentWizard.registerAgentType('custom', CustomAgentType);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

Please ensure your code:
- Passes existing tests
- Includes documentation
- Follows the project's coding style
- Includes type definitions

## License

MIT License - See LICENSE file for details
