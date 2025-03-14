// Initialize OpenRouter API key
const initApiKey = () => {
  localStorage.setItem('openrouter_api_key', '');
  console.log('OpenRouter API key initialized in localStorage');
};

document.addEventListener('DOMContentLoaded', initApiKey);
