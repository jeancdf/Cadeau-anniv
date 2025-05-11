export const environment = {
  production: true,
  apiUrl: 'https://cadeau-anniv-backend.onrender.com/api',
  secretKey: '${SECRET_KEY}', // Sera remplacé lors du déploiement
  geminiApiKey: '${GEMINI_API_KEY}', // Sera remplacé lors du build
  geminiModel: '${GEMINI_MODEL}' // Sera remplacé lors du build
}; 