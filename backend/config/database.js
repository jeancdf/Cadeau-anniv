import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables from config.env file
dotenv.config({ path: './config.env' });

const DATABASE_URL = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DATABASE_URL && (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD)) {
  console.error('ERROR: configurez DATABASE_URL ou DB_HOST, DB_NAME, DB_USER et DB_PASSWORD');
  process.exit(1);
}

// Check if we're connecting to Render
const isRenderDB = DATABASE_URL?.includes('render.com');

// Sequelize configuration
const sequelizeConfig = {
  dialect: 'postgres',
  logging: false,
};

// Add SSL options for Render
if (isRenderDB) {
  console.log('Configuring SSL for Render database connection');
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
}

// Create Sequelize instance
let sequelize;
try {
  sequelize = DATABASE_URL
    ? new Sequelize(DATABASE_URL, sequelizeConfig)
    : new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
        ...sequelizeConfig,
        host: DB_HOST,
        port: DB_PORT
      });
  console.log('Sequelize instance created');
} catch (error) {
  console.error('Error creating Sequelize instance:', error);
  process.exit(1);
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à PostgreSQL établie avec succès.');
  } catch (error) {
    console.error('Impossible de se connecter à PostgreSQL:', error);
    throw error;
  }
};

export { sequelize, testConnection };
