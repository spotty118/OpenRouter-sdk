/**
 * Token counting utilities for different model types
 */

interface TokenizerConfig {
  charsPerToken: number;
  specialTokens: Record<string, number>;
}

const TOKENIZER_CONFIGS: Record<string, TokenizerConfig> = {
  'claude-3': {
    charsPerToken: 3.5,  // Claude 3 models have slightly better tokenization
    specialTokens: {
      '<s>': 1,
      '</s>': 1,
      '<im_start>': 1,
      '<im_end>': 1,
      '<image>': 1
    }
  },
  'claude-2': {
    charsPerToken: 4,    // Claude 2 models use roughly 4 chars per token
    specialTokens: {
      '<s>': 1,
      '</s>': 1,
      'Human:': 1,
      'Assistant:': 1
    }
  },
  'default': {
    charsPerToken: 4,
    specialTokens: {}
  }
};

/**
 * Count tokens in a text string
 * 
 * @param text - The text to count tokens for
 * @param modelType - Optional model type for more accurate counting ('claude-3', 'claude-2', or 'default')
 * @returns Approximate token count
 */
export function countTokens(text: string, modelType: string = 'default'): number {
  const config = TOKENIZER_CONFIGS[modelType] || TOKENIZER_CONFIGS.default;
  
  // Start with basic character-based count
  let count = Math.ceil(text.length / config.charsPerToken);
  
  // Add counts for special tokens
  for (const [token, tokenCount] of Object.entries(config.specialTokens)) {
    const matches = text.match(new RegExp(token, 'g'));
    if (matches) {
      count += matches.length * tokenCount;
    }
  }
  
  return Math.ceil(count);
