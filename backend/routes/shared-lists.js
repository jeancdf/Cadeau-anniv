import express from 'express';
import { UniqueConstraintError } from 'sequelize';
import { SharedList } from '../models/shared-list.js';
import {
  createEditToken,
  editTokensMatch,
  hashEditToken,
  normalizeSharedListPayload,
  normalizeSlug,
  toPublicSharedList
} from '../services/shared-list-utils.js';
import { fetchProductPreview } from '../services/product-preview.js';

const router = express.Router();
const usageByIp = new Map();

const createRateLimit = ({ keyPrefix, windowMs, maximum }) => (req, res, next) => {
  const now = Date.now();
  const key = `${keyPrefix}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  const usage = usageByIp.get(key);

  if (!usage || usage.resetAt <= now) {
    usageByIp.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  if (usage.count >= maximum) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((usage.resetAt - now) / 1000))));
    return res.status(429).json({ message: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }

  usage.count += 1;
  return next();
};

router.post(
  '/shared-lists',
  createRateLimit({ keyPrefix: 'publish', windowMs: 10 * 60 * 1000, maximum: 15 }),
  async (req, res) => {
    try {
      const payload = normalizeSharedListPayload(req.body, { requireSlug: true });
      const editToken = createEditToken();
      const sharedList = await SharedList.create({
        ...payload,
        editTokenHash: hashEditToken(editToken)
      });

      return res.status(201).json({
        list: toPublicSharedList(sharedList),
        editToken
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError || error?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Ce lien personnalisé est déjà utilisé' });
      }
      console.error('Erreur lors de la publication de la liste:', error);
      return res.status(400).json({ message: error.message || 'Impossible de publier cette liste' });
    }
  }
);

router.get('/shared-lists/:slug', async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const sharedList = slug ? await SharedList.findOne({ where: { slug } }) : null;
    if (!sharedList) {
      return res.status(404).json({ message: 'Cette liste n’existe pas ou plus' });
    }
    return res.json(toPublicSharedList(sharedList));
  } catch (error) {
    console.error('Erreur lors de la lecture de la liste partagée:', error);
    return res.status(500).json({ message: 'Impossible de charger cette liste' });
  }
});

router.put('/shared-lists/:slug', async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const sharedList = slug ? await SharedList.findOne({ where: { slug } }) : null;
    if (!sharedList) {
      return res.status(404).json({ message: 'Cette liste n’existe pas ou plus' });
    }

    if (!editTokensMatch(req.header('X-Edit-Token'), sharedList.editTokenHash)) {
      return res.status(403).json({ message: 'Vous ne pouvez pas modifier cette liste' });
    }

    const payload = normalizeSharedListPayload(req.body);
    await sharedList.update(payload);
    return res.json({ list: toPublicSharedList(sharedList) });
  } catch (error) {
    console.error('Erreur lors de la republication de la liste:', error);
    return res.status(400).json({ message: error.message || 'Impossible de mettre à jour cette liste' });
  }
});

router.post(
  '/product-preview',
  createRateLimit({ keyPrefix: 'preview', windowMs: 10 * 60 * 1000, maximum: 30 }),
  async (req, res) => {
    try {
      const preview = await fetchProductPreview(req.body?.url);
      return res.json(preview);
    } catch (error) {
      console.error('Erreur lors de l’analyse du lien produit:', error);
      const status = error?.name === 'TimeoutError' ? 504 : 422;
      return res.status(status).json({ message: error.message || 'Impossible d’analyser ce lien' });
    }
  }
);

export default router;
