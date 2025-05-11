import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// Définition du modèle Gift (Cadeau)
const Gift = sequelize.define('Gift', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Les pricePoints seront stockés sous forme de JSONB pour faciliter le stockage de tableaux
  pricePoints: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
});

// Fonction pour synchroniser le modèle avec la base de données
const syncGiftModel = async () => {
  try {
    await Gift.sync();
    console.log("Modèle Gift synchronisé avec la base de données");
  } catch (error) {
    console.error("Erreur lors de la synchronisation du modèle Gift:", error);
  }
};

export { Gift, syncGiftModel }; 