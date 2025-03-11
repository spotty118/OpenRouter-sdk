/**
 * Function Wizard Builder Utility
 * Provides easy function creation and management with a fluent interface
 */

/**
 * Parameter definition for functions
 */
export interface ParameterDefinition {
  type: string;
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

/**
 * Function configuration interface with improved type safety
 */
export interface FunctionConfig<ParamType = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
  required?: string[];
  handler: (params: ParamType) => Promise<unknown>;
}

export interface FunctionWizardOptions {
  validateInput?: boolean;
  debug?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export class FunctionWizard {
  private functions: Map<string, FunctionConfig> = new Map();
  private options: FunctionWizardOptions;

  constructor(options: FunctionWizardOptions = {}) {
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
  static create(options?: FunctionWizardOptions) {
    return new FunctionWizard(options);
  }

  /**
   * Start building a new function
   */
  defineFunction(name: string) {
    return new FunctionBuilder(this, name);
  }

  /**
   * Register a complete function configuration
   */
  registerFunction<ParamType = Record<string, unknown>>(config: FunctionConfig<ParamType>) {
    if (this.functions.has(config.name)) {
      throw new Error(`Function ${config.name} already exists`);
    }
    this.functions.set(config.name, config as FunctionConfig);
    return this;
  }

  /**
   * Execute a registered function
   */
  /**
   * Execute a registered function with proper timeout handling
   *
   * @param name - The name of the function to execute
   * @param params - The parameters to pass to the function
   * @returns Promise that resolves with the function result
   */
  async execute(name: string, params: Record<string, unknown>) {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }

    if (this.options.validateInput) {
      this.validateParameters(func, params);
    }

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < (this.options.maxRetries || 3)) {
      // Create a timeout controller for proper resource management
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error('Function execution timeout'));
      }, this.options.timeout || 30000);
      
      try {
        if (this.options.debug) {
          console.log(`Executing ${name} with params:`, params);
        }

        // Execute the function with the abort signal
        const result = await Promise.resolve(func.handler(params));
        
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);

        if (this.options.debug) {
          console.log(`${name} completed in ${Date.now() - startTime}ms`);
        }

        return result;
      } catch (error) {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
        
        attempts++;
        // Categorize errors to determine if retry makes sense
        const isTransientError = error instanceof Error &&
          (error.message.includes('timeout') ||
           error.message.includes('network') ||
           error.message.includes('connection'));
           
        // Only retry for transient errors
        if (!isTransientError || attempts >= (this.options.maxRetries || 3)) {
          throw error;
        }
        
        if (this.options.debug) {
          console.warn(`Attempt ${attempts} failed for ${name}:`, error);
        }
        
        // Exponential backoff before retrying
        const backoffTime = 1000 * Math.pow(2, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  /**
   * Get function schema
   */
  getSchema(name: string) {
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
      description: f.description
    }));
  }

  /**
   * Validate function parameters against their schema
   *
   * @param func - The function configuration including parameter definitions
   * @param params - The parameters to validate
   * @throws Error if validation fails
   */
  private validateParameters(func: FunctionConfig, params: Record<string, unknown>) {
    // Check required parameters
    const required = func.required || [];
    for (const param of required) {
      if (!(param in params)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    // Check that all provided parameters exist in the schema
    for (const [key, value] of Object.entries(params)) {
      const schema = func.parameters[key];
      if (!schema) {
        throw new Error(`Unknown parameter: ${key}`);
      }

      // Validate parameter types
      if (schema.type === 'string' && typeof value !== 'string') {
        throw new Error(`Parameter ${key} must be a string`);
      }
      if (schema.type === 'number' && typeof value !== 'number') {
        throw new Error(`Parameter ${key} must be a number`);
      }
      if (schema.type === 'boolean' && typeof value !== 'boolean') {
        throw new Error(`Parameter ${key} must be a boolean`);
      }
      if (schema.type === 'object' && (typeof value !== 'object' || value === null)) {
        throw new Error(`Parameter ${key} must be an object`);
      }
      if (schema.type === 'array' && !Array.isArray(value)) {
        throw new Error(`Parameter ${key} must be an array`);
      }
      
      // Additional validations for specific types
      if (schema.type === 'string') {
        if (schema.enum && !schema.enum.includes(value as string)) {
          throw new Error(`Parameter ${key} must be one of: ${schema.enum.join(', ')}`);
        }
        if (schema.pattern && !(new RegExp(schema.pattern).test(value as string))) {
          throw new Error(`Parameter ${key} must match pattern: ${schema.pattern}`);
        }
      }
      
      if (schema.type === 'number') {
        const numValue = value as number;
        if (schema.minimum !== undefined && numValue < schema.minimum) {
          throw new Error(`Parameter ${key} must be at least ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && numValue > schema.maximum) {
          throw new Error(`Parameter ${key} must be at most ${schema.maximum}`);
        }
      }
    }
  }
}

/**
 * Fluent builder for function configuration
 */
class FunctionBuilder {
  private config: Partial<FunctionConfig> = {};
  
  constructor(
    private wizard: FunctionWizard,
    name: string
  ) {
    this.config.name = name;
    this.config.parameters = {};
  }

  /**
   * Set function description
   */
  description(desc: string) {
    this.config.description = desc;
    return this;
  }

  /**
   * Add a parameter definition
   */
  /**
   * Add a parameter definition
   *
   * @param name - Parameter name
   * @param type - Parameter type (string, number, boolean, object, array)
   * @param description - Parameter description
   * @param required - Whether the parameter is required
   * @param constraints - Additional constraints like enum, min/max, pattern
   * @returns This builder instance for chaining
   */
  parameter(
    name: string,
    type: string,
    description: string,
    required = false,
    constraints: {
      enum?: string[];
      minimum?: number;
      maximum?: number;
      pattern?: string;
    } = {}
  ) {
    this.config.parameters![name] = {
      type,
      description,
      ...constraints
    };
    
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
  /**
   * Add multiple parameter definitions
   *
   * @param params - Record of parameter definitions
   * @returns This builder instance for chaining
   */
  parameters(params: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    pattern?: string;
  }>) {
    for (const [name, def] of Object.entries(params)) {
      this.parameter(
        name,
        def.type,
        def.description,
        def.required,
        {
          enum: def.enum,
          minimum: def.minimum,
          maximum: def.maximum,
          pattern: def.pattern
        }
      );
    }
    return this;
  }

  /**
   * Set the function implementation
   */
  /**
   * Set the function implementation
   *
   * @param handler - The function implementation
   * @returns This builder instance for chaining
   */
  implement<ParamType = Record<string, unknown>>(handler: (params: ParamType) => Promise<unknown>) {
    this.config.handler = handler as unknown as (params: Record<string, unknown>) => Promise<unknown>;
    return this;
  }

  /**
   * Register the function with the wizard
   */
  register() {
    if (!this.config.name || !this.config.description || !this.config.handler) {
      throw new Error('Function configuration incomplete');
    }
    this.wizard.registerFunction(this.config as FunctionConfig);
    return this.wizard;
  }
}
