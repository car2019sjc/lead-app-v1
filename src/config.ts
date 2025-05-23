console.log('Environment variables:', {
  apolloApiKey: import.meta.env.VITE_APOLLO_API_KEY,
  mailsApiKey: import.meta.env.VITE_MAILS_API_KEY,
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY
});

export const config = {
  apolloApiKey: import.meta.env.VITE_APOLLO_API_KEY,
  mailsApiKey: import.meta.env.VITE_MAILS_API_KEY
};

export default config;