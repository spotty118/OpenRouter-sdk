// Initialize OpenRouter API key
const initApiKey = () => {
  localStorage.setItem('openrouter_api_key', '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');
  console.log('OpenRouter API key initialized in localStorage');
};

document.addEventListener('DOMContentLoaded', initApiKey);
