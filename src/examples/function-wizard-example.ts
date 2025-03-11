import { FunctionWizard } from '../utils/function-wizard.js';

interface GreetParams {
  name: string;
  language?: string;
}

interface CalculateParams {
  operation: 'add' | 'subtract' | 'multiply' | 'divide';
  a: number;
  b: number;
}

interface TransformParams {
  data: string;
  format: 'upper' | 'lower' | 'capitalize';
}

// Create a new wizard instance with debug mode enabled
const wizard = FunctionWizard.create({ debug: true });

// Example 1: Simple greeting function
wizard.defineFunction('greet')
  .description('Generate a greeting message')
  .parameter('name', 'string', 'Name of the person to greet', true)
  .parameter('language', 'string', 'Language for greeting', false)
  .implement(async ({ name, language = 'en' }: GreetParams) => {
    const greetings: Record<string, string> = {
      en: 'Hello',
      es: 'Hola',
      fr: 'Bonjour'
    };
    return `${greetings[language] || greetings.en}, ${name}!`;
  })
  .register();

// Example 2: Math calculation function
wizard.defineFunction('calculate')
  .description('Perform basic math calculations')
  .parameter('operation', 'string', 'Math operation to perform (add, subtract, multiply, divide)', true)
  .parameter('a', 'number', 'First number', true)
  .parameter('b', 'number', 'Second number', true)
  .implement(async ({ operation, a, b }: CalculateParams) => {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': 
        if (b === 0) throw new Error('Cannot divide by zero');
        return a / b;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  })
  .register();

// Example 3: Data transformation function
wizard.defineFunction('transformData')
  .description('Transform data according to specified format')
  .parameter('data', 'string', 'Input data to transform', true)
  .parameter('format', 'string', 'Output format (upper, lower, capitalize)', true)
  .implement(async ({ data, format }: TransformParams) => {
    switch (format) {
      case 'upper': return data.toUpperCase();
      case 'lower': return data.toLowerCase();
      case 'capitalize': return data.charAt(0).toUpperCase() + data.slice(1).toLowerCase();
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  })
  .register();

// Example usage
async function runExamples() {
  try {
    // List all registered functions
    console.log('Available functions:', wizard.listFunctions());

    // Execute greeting function
    const greeting = await wizard.execute('greet', {
      name: 'Alice',
      language: 'es'
    });
    console.log('Greeting result:', greeting);

    // Execute calculation function
    const calculation = await wizard.execute('calculate', {
      operation: 'multiply',
      a: 5,
      b: 3
    });
    console.log('Calculation result:', calculation);

    // Execute data transformation
    const transformed = await wizard.execute('transformData', {
      data: 'hello WORLD',
      format: 'capitalize'
    });
    console.log('Transformation result:', transformed);

    // Get schema for a function
    console.log('Calculate function schema:', wizard.getSchema('calculate'));
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples
runExamples().catch(console.error);
