import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from config.env file
dotenv.config({ path: './config.env' });

console.log('Database URL:', process.env.DATABASE_URL);

// Get database connection string from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

// Default to local database if environment variable is not set (should not happen)
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set in config.env');
  process.exit(1);
}

// Check if we're connecting to Render
const isRenderDB = DATABASE_URL.includes('render.com');

// Sequelize configuration
const sequelizeConfig = {
  dialect: 'postgres',
  logging: console.log, // Enable logging for debugging
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
  sequelize = new Sequelize(DATABASE_URL, sequelizeConfig);
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
  }
};

export { sequelize, testConnection };