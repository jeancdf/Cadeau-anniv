import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const SharedGiftList = sequelize.define('SharedGiftList', {
  publicId: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true
  },
  occasion: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  audienceLabel: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  gifts: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true,
  updatedAt: false,
  indexes: [{ unique: true, fields: ['publicId'] }]
});

const syncSharedGiftListModel = async () => {
  try {
    await SharedGiftList.sync();
    console.log('Modèle SharedGiftList synchronisé avec la base de données');
  } catch (error) {
    console.error('Erreur lors de la synchronisation du modèle SharedGiftList:', error);
    throw error;
  }
};

export { SharedGiftList, syncSharedGiftListModel };
