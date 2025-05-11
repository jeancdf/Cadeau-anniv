import express from 'express';
import { Gift } from '../models/gift.js';
import { Op } from 'sequelize';

const router = express.Router();

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
    // Trier les pricePoints par prix si disponibles
    if (req.body.pricePoints && Array.isArray(req.body.pricePoints)) {
      req.body.pricePoints.sort((a, b) => a.price - b.price);
    }
    
    const gift = await Gift.create(req.body);
    res.status(201).json(gift);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du cadeau:', error);
    res.status(400).json({ 
      message: 'Erreur lors de l\'ajout du cadeau',
      error: error.message
    });
  }
});

// Mettre à jour un cadeau
router.put('/gifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Trier les pricePoints par prix si disponibles
    if (req.body.pricePoints && Array.isArray(req.body.pricePoints)) {
      req.body.pricePoints.sort((a, b) => a.price - b.price);
    }
    
    const [updated] = await Gift.update(req.body, {
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