const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Valeurs par défaut si les variables d'environnement ne sont pas définies
const defaultEnvValues = {
  GEMINI_API_KEY: 'AIzaSyByahoGsqsWe6qkq_VVam8DGyRlS5xuOmA',
  GEMINI_MODEL: 'gemini-2.5-pro-exp-03-25',
  SECRET_KEY: 'dev-secret-key'
};

// Chemin des fichiers d'environnement
const environmentFiles = [
  {
    path: path.resolve(__dirname, './src/environments/environment.ts'),
    production: false
  },
  {
    path: path.resolve(__dirname, './src/environments/environment.prod.ts'),
    production: true
  }
];

// Remplace les variables d'environnement dans les fichiers
environmentFiles.forEach(file => {
  if (fs.existsSync(file.path)) {
    let content = fs.readFileSync(file.path, 'utf8');
    
    // Remplacer les variables
    content = content
      .replace('${GEMINI_API_KEY}', process.env.GEMINI_API_KEY || defaultEnvValues.GEMINI_API_KEY)
      .replace('${GEMINI_MODEL}', process.env.GEMINI_MODEL || defaultEnvValues.GEMINI_MODEL)
      .replace('${SECRET_KEY}', process.env.SECRET_KEY || defaultEnvValues.SECRET_KEY);
    
    fs.writeFileSync(file.path, content);
    console.log(`Variables d'environnement injectées dans ${file.path}`);
  }
});

console.log('Configuration des variables d\'environnement terminée'); 