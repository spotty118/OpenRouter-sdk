/**
 * Function Wizard Builder Utility
 * Provides easy function creation and management with a fluent interface
 */

export class FunctionWizard {
  constructor(options = {}) {
    this.functions = new Map();
    this.options = {
      validateInput: true,
      debug: false,
      maxRetries: 3,
      timeout: 30000,
      ...options
    };
  }

  /**
   * Create a new function builder instance
   */
  static create(options) {
    return new FunctionWizard(options);
  }

  /**
   * Start building a new function
   */
  defineFunction(name) {
    return new FunctionBuilder(this, name);
  }

  /**
   * Register a complete function configuration
   */
  registerFunction(config) {
    if (this.functions.has(config.name)) {
      throw new Error(`Function ${config.name} already exists`);
    }
    this.functions.set(config.name, config);
    return this;
  }

  /**
   * Execute a registered function
   */
  async execute(name, params) {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }

    if (this.options.validateInput) {
      this.validateParameters(func, params);
    }

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.options.maxRetries) {
      try {
        if (this.options.debug) {
          console.log(`Executing ${name} with params:`, params);
        }

        const result = await Promise.race([
          func.handler(params),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Function execution timeout')), 
            this.options.timeout)
          )
        ]);

        if (this.options.debug) {
          console.log(`${name} completed in ${Date.now() - startTime}ms`);
        }

        return result;
      } catch (error) {
        attempts++;
        if (attempts >= this.options.maxRetries) {
          throw error;
        }
        if (this.options.debug) {
          console.warn(`Attempt ${attempts} failed for ${name}:`, error);
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }

  /**
   * Get function schema
   */
  getSchema(name) {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }
    return {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
      required: func.required
    };
  }

  /**
   * List all registered functions
   */
  listFunctions() {
    return Array.from(this.functions.values()).map(f => ({
      name: f.name,
      description: f.description,
      parameters: f.parameters,
      implementation: f.handler
    }));
  }

  /**
   * Get a specific function by name
   */
  getFunction(name) {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }
    return {
      name: func.name,
      description: func.description,
      parameters: func.parameters,
      implementation: func.handler
    };
  }

  validateParameters(func, params) {
    const required = func.required || [];
    for (const param of required) {
      if (!(param in params)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    for (const [key, value] of Object.entries(params)) {
      const schema = func.parameters[key];
      if (!schema) {
        throw new Error(`Unknown parameter: ${key}`);
      }

      if (schema.type === 'string' && typeof value !== 'string') {
        throw new Error(`Parameter ${key} must be a string`);
      }
      if (schema.type === 'number' && typeof value !== 'number') {
        throw new Error(`Parameter ${key} must be a number`);
      }
      if (schema.type === 'boolean' && typeof value !== 'boolean') {
        throw new Error(`Parameter ${key} must be a boolean`);
      }
    }
  }
}

/**
 * Fluent builder for function configuration
 */
class FunctionBuilder {
  constructor(wizard, name) {
    this.wizard = wizard;
    this.config = {
      name,
      parameters: {}
    };
  }

  /**
   * Set function description
   */
  description(desc) {
    this.config.description = desc;
    return this;
  }

  /**
   * Add a parameter definition
   */
  parameter(name, type, description, required = false) {
    this.config.parameters[name] = { type, description };
    if (required) {
      if (!this.config.required) {
        this.config.required = [];
      }
      this.config.required.push(name);
    }
    return this;
  }

  /**
   * Add multiple parameter definitions
   */
  parameters(params) {
    for (const [name, def] of Object.entries(params)) {
      this.parameter(name, def.type, def.description, def.required);
    }
    return this;
  }

  /**
   * Set the function implementation
   */
  implement(handler) {
    this.config.handler = handler;
    return this;
  }

  /**
   * Register the function with the wizard
   */
  register() {
    if (!this.config.name || !this.config.description || !this.config.handler) {
      throw new Error('Function configuration incomplete');
    }
    this.wizard.registerFunction(this.config);
    return this.wizard;
  }
}
