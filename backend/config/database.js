import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// Récupérer les informations de connexion depuis les variables d'environnement
// Format: postgres://username:password@host:port/database
const DATABASE_URL = process.env.DATABASE_URL;

// Configuration de Sequelize
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'production' ? false : console.log,
  dialectOptions: {
    ssl: {
      require: process.env.NODE_ENV === 'production',
      rejectUnauthorized: false // Nécessaire pour Render
    }
  }
});

// Tester la connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à PostgreSQL établie avec succès.');
  } catch (error) {
    console.error('Impossible de se connecter à PostgreSQL:', error);
  }
};

export { sequelize, testConnection }; 