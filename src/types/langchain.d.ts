// Type definitions for LangChain libraries
// Project: https://js.langchain.com/
// Definitions by: OpenRouter SDK Team

declare module '@langchain/openai' {
  export class ChatOpenAI {
    constructor(options: {
      modelName: string;
      temperature?: number;
      maxTokens?: number;
      apiKey?: string;
      [key: string]: any;
    });
    
    invoke(messages: any[]): Promise<{
      content: string;
      [key: string]: any;
    }>;
  }
}

declare module '@langchain/anthropic' {
  export class ChatAnthropic {
    constructor(options: {
      modelName: string;
      temperature?: number;
      maxTokens?: number;
      apiKey?: string;
      [key: string]: any;
    });
    
    invoke(messages: any[]): Promise<{
      content: string;
      [key: string]: any;
    }>;
  }
}

declare module '@langchain/google-genai' {
  export class ChatGoogleGenerativeAI {
    constructor(options: {
      modelName: string;
      temperature?: number;
      maxOutputTokens?: number;
      apiKey?: string;
      [key: string]: any;
    });
    
    invoke(messages: any[]): Promise<{
      content: string;
      [key: string]: any;
    }>;
  }
}

declare module 'langchain/agents' {
  export class AgentExecutor {
    static fromAgentAndTools(agent: any, tools: any[]): AgentExecutor;
    invoke(input: any): Promise<any>;
  }
}

declare module '@langchain/core/prompts' {
  export class PromptTemplate {
    static fromTemplate(template: string): PromptTemplate;
    format(input: Record<string, any>): Promise<string>;
  }
}

declare module '@langchain/core/messages' {
  export class SystemMessage {
    constructor(content: string);
  }
  
  export class HumanMessage {
    constructor(content: string);
  }
}