import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

// Récupérer les informations de connexion depuis les variables d'environnement
// Format: postgres://username:password@host:port/database
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/gift-list';
const isProduction = process.env.NODE_ENV === 'production';

// Configuration de Sequelize
const sequelizeConfig = {
  dialect: 'postgres',
  logging: isProduction ? false : console.log,
};

// Ajouter les options SSL uniquement en production
if (isProduction) {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false // Nécessaire pour Render
    }
  };
}

const sequelize = new Sequelize(DATABASE_URL, sequelizeConfig);

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