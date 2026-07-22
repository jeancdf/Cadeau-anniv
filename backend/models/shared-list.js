import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const SharedList = sequelize.define('SharedList', {
  slug: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  occasion: {
    type: DataTypes.STRING(80),
    allowNull: false,
    defaultValue: ''
  },
  gifts: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  editTokenHash: {
    type: DataTypes.STRING(64),
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [{ unique: true, fields: ['slug'] }]
});

const syncSharedListModel = async () => {
  await SharedList.sync();
};

export { SharedList, syncSharedListModel };
