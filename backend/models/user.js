import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  passwordSalt: {
    type: DataTypes.STRING(64),
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [{ unique: true, fields: ['email'] }]
});

const syncUserModel = async () => {
  await User.sync();
};

export { User, syncUserModel };
