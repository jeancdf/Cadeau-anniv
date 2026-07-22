import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './user.js';

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
  audienceLabel: {
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
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'SET NULL'
  }
}, {
  timestamps: true
});

const syncSharedListModel = async () => {
  await SharedList.sync();
  const queryInterface = sequelize.getQueryInterface();
  const tableName = SharedList.getTableName();
  const description = await queryInterface.describeTable(tableName);
  if (!description.ownerId) {
    await queryInterface.addColumn(tableName, 'ownerId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: User.getTableName(),
        key: 'id'
      },
      onDelete: 'SET NULL'
    });
  }

  const indexes = await queryInterface.showIndex(tableName);
  if (!indexes.some(index => index.name === 'shared_lists_owner_id')) {
    await queryInterface.addIndex(tableName, ['ownerId'], { name: 'shared_lists_owner_id' });
  }
};

export { SharedList, syncSharedListModel };
