import express from 'express';
import { GiftClick } from '../models/gift-click.js';
import { SharedList } from '../models/shared-list.js';
import { buildStatsSnapshot } from '../services/stats-utils.js';

const router = express.Router();

router.get('/stats/overview', async (_req, res) => {
  try {
    const [lists, clicks] = await Promise.all([
      SharedList.findAll({
        attributes: ['id', 'slug', 'title', 'gifts', 'createdAt'],
        order: [['createdAt', 'DESC']]
      }),
      GiftClick.findAll({
        attributes: ['sharedListId', 'giftId', 'giftName', 'merchant', 'isAffiliate', 'createdAt'],
        order: [['createdAt', 'DESC']]
      })
    ]);

    return res.json(buildStatsSnapshot(lists, clicks));
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
    return res.status(500).json({ message: 'Impossible de charger les statistiques' });
  }
});

export default router;
