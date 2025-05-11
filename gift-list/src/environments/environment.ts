// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Import the production environment when in production mode
import { environment as prodEnvironment } from './environment.prod';

// For local development
const devEnvironment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  secretKey: 'dev-secret-key',
  geminiApiKey: 'AIzaSyByahoGsqsWe6qkq_VVam8DGyRlS5xuOmA',
  geminiModel: 'gemini-2.5-pro-exp-03-25'
};

// Use production environment if NODE_ENV is set to 'production'
export const environment = devEnvironment; 