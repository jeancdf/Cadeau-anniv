import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import giftRoutes from './routes/gifts.js';
import { sequelize, testConnection } from './config/database.js';
import { syncGiftModel } from './models/gift.js';

// Charger les variables d'environnement
dotenv.config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key';

// Middleware pour le parsing JSON et CORS
app.use(express.json());
app.use(cors());

// Health check endpoint (sans vérification de clé)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Middleware pour vérifier la clé secrète (sauf pour le health check)
app.use((req, res, next) => {
  const secretKey = req.headers['x-secret-key'];
  
  if (!secretKey || secretKey !== SECRET_KEY) {
    return res.status(403).json({ message: 'Accès non autorisé' });
  }
  
  next();
});

// Routes
app.use('/api', giftRoutes);

// Route de base
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API de liste de cadeaux' });
});

// Initialisation de la base de données et démarrage du serveur
const initializeServer = async () => {
  try {
    // Tester la connexion à la base de données
    await testConnection();
    
    // Synchroniser les modèles avec la base de données
    await syncGiftModel();
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
initializeServer();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('Erreur non gérée:', err);
}); 