import express from 'express';
import { Gift } from '../models/gift.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

const normalizePricePoints = (pricePoints) => {
  if (!Array.isArray(pricePoints)) {
    throw new Error('Les options de prix doivent être un tableau');
  }

  return pricePoints.map((point, index) => {
    const label = String(point?.label || '').trim();
    const price = Number(point?.price);
    const link = String(point?.link || '').trim();

    if (!label) {
      throw new Error(`Le libellé de l'option ${index + 1} est requis`);
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Le prix de l'option ${index + 1} est invalide`);
    }

    return { label, price, link };
  }).sort((first, second) => first.price - second.price);
};

const buildGiftPayload = (body, requireName = false) => {
  const source = body && typeof body === 'object' ? body : {};
  const payload = {};

  if (requireName || Object.hasOwn(source, 'name')) {
    const name = String(source.name || '').trim();
    if (!name) {
      throw new Error('Le nom du cadeau est requis');
    }
    payload.name = name;
  }

  if (Object.hasOwn(source, 'description')) {
    payload.description = String(source.description || '').trim();
  }

  if (Object.hasOwn(source, 'priority')) {
    const priority = Number(source.priority);
    if (!Number.isInteger(priority) || priority < 0) {
      throw new Error('La priorité doit être un entier positif');
    }
    payload.priority = priority;
  }

  if (Object.hasOwn(source, 'pricePoints')) {
    payload.pricePoints = normalizePricePoints(source.pricePoints);
  }

  return payload;
};

// Récupérer tous les cadeaux (triés par priorité)
router.get('/gifts', async (req, res) => {
  try {
    const gifts = await Gift.findAll({
      order: [['priority', 'ASC']]
    });
    res.json(gifts);
  } catch (error) {
    console.error('Erreur lors de la récupération des cadeaux:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajouter un nouveau cadeau
router.post('/gifts', async (req, res) => {
  try {
    const giftPayload = buildGiftPayload(req.body, true);
    if (giftPayload.priority === undefined) {
      const maximumPriority = Number(await Gift.max('priority'));
      giftPayload.priority = Number.isFinite(maximumPriority) ? maximumPriority + 1 : 0;
    }

    const gift = await Gift.create(giftPayload);
    res.status(201).json(gift);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du cadeau:', error);
    res.status(400).json({ 
      message: 'Erreur lors de l\'ajout du cadeau',
      error: error.message
    });
  }
});

// Réordonner la liste en une seule transaction afin d'éviter les priorités partielles
router.patch('/gifts/reorder', async (req, res) => {
  const priorities = req.body?.priorities;
  if (!Array.isArray(priorities) || priorities.length === 0) {
    return res.status(400).json({ message: 'Une liste de priorités est requise' });
  }

  try {
    const seenIds = new Set();
    const normalizedPriorities = priorities.map((item, index) => {
      const id = item?.id;
      const priority = Number(item?.priority);
      if (id === undefined || id === null || seenIds.has(String(id))) {
        throw new Error(`Identifiant invalide à la position ${index + 1}`);
      }
      if (!Number.isInteger(priority) || priority < 0) {
        throw new Error(`Priorité invalide à la position ${index + 1}`);
      }
      seenIds.add(String(id));
      return { id, priority };
    });

    await sequelize.transaction(async (transaction) => {
      for (const item of normalizedPriorities) {
        const [updatedCount] = await Gift.update(
          { priority: item.priority },
          { where: { id: item.id }, transaction }
        );
        if (updatedCount !== 1) {
          throw new Error(`Cadeau ${item.id} introuvable`);
        }
      }
    });

    res.json({ message: 'Ordre mis à jour', priorities: normalizedPriorities });
  } catch (error) {
    console.error('Erreur lors de la réorganisation des cadeaux:', error);
    res.status(400).json({ message: 'La réorganisation a échoué', error: error.message });
  }
});

// Mettre à jour un cadeau
router.put('/gifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const giftPayload = buildGiftPayload(req.body);

    if (Object.keys(giftPayload).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée valide à mettre à jour' });
    }
    
    const [updated] = await Gift.update(giftPayload, {
      where: { id }
    });
    
    if (updated) {
      const updatedGift = await Gift.findByPk(id);
      res.json(updatedGift);
    } else {
      res.status(404).json({ message: 'Cadeau non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du cadeau:', error);
    res.status(400).json({ 
      message: 'Erreur lors de la mise à jour du cadeau',
      error: error.message
    });
  }
});

// Supprimer un cadeau
router.delete('/gifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Gift.destroy({
      where: { id }
    });
    
    if (deleted) {
      res.json({ message: 'Cadeau supprimé avec succès' });
    } else {
      res.status(404).json({ message: 'Cadeau non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du cadeau:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Exporter les cadeaux (format JSON)
router.get('/export', async (req, res) => {
  try {
    const gifts = await Gift.findAll({
      order: [['priority', 'ASC']]
    });
    res.json(gifts);
  } catch (error) {
    console.error('Erreur lors de l\'exportation des cadeaux:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
