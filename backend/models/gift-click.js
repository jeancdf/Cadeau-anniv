import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SharedList } from './shared-list.js';

const GiftClick = sequelize.define('GiftClick', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sharedListId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: SharedList,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  giftId: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  giftName: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  linkKey: {
    type: DataTypes.STRING(40),
    allowNull: false
  },
  merchant: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  isAffiliate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true,
  updatedAt: false
});

const syncGiftClickModel = async () => {
  await GiftClick.sync();
  const queryInterface = sequelize.getQueryInterface();
  const tableName = GiftClick.getTableName();
  const indexes = await queryInterface.showIndex(tableName);

  if (!indexes.some(index => index.name === 'gift_clicks_shared_list_id')) {
    await queryInterface.addIndex(tableName, ['sharedListId'], { name: 'gift_clicks_shared_list_id' });
  }
  if (!indexes.some(index => index.name === 'gift_clicks_gift_id')) {
    await queryInterface.addIndex(tableName, ['giftId'], { name: 'gift_clicks_gift_id' });
  }
  if (!indexes.some(index => index.name === 'gift_clicks_created_at')) {
    await queryInterface.addIndex(tableName, ['createdAt'], { name: 'gift_clicks_created_at' });
  }
};

export { GiftClick, syncGiftClickModel };
