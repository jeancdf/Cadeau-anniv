export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  secretKey: 'dev-secret-key',
  geminiApiKey: '${GEMINI_API_KEY}', // Sera remplacé lors du build
  geminiModel: '${GEMINI_MODEL}' // Sera remplacé lors du build
}; 