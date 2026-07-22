import express from 'express';
import { UniqueConstraintError } from 'sequelize';
import { User } from '../models/user.js';
import { SharedList } from '../models/shared-list.js';
import {
  clearUserSession,
  createPasswordCredentials,
  createUserSession,
  normalizeEmail,
  passwordMatches,
  requireUser,
  serializeUser
} from '../services/user-auth.js';

const router = express.Router();
const attemptsByIp = new Map();

const authRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const usage = attemptsByIp.get(key);
  if (!usage || usage.resetAt <= now) {
    attemptsByIp.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return next();
  }
  if (usage.count >= 20) {
    res.set('Retry-After', String(Math.max(1, Math.ceil((usage.resetAt - now) / 1000))));
    return res.status(429).json({ message: 'Trop de tentatives. Réessayez dans quelques minutes.' });
  }
  usage.count += 1;
  return next();
};

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.post('/account/register', authRateLimit, async (req, res) => {
  try {
    const displayName = String(req.body?.displayName || '').trim().slice(0, 80);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (displayName.length < 2) {
      return res.status(400).json({ message: 'Indiquez un prénom ou un nom d’au moins 2 caractères' });
    }
    if (!validEmail(email)) {
      return res.status(400).json({ message: 'Indiquez une adresse email valide' });
    }
    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir entre 10 et 128 caractères' });
    }

    const credentials = await createPasswordCredentials(password);
    const user = await User.create({ displayName, email, ...credentials });
    await createUserSession(user, res);
    return res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    if (error instanceof UniqueConstraintError || error?.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Un compte utilise déjà cette adresse email' });
    }
    console.error('Erreur lors de la création du compte:', error);
    return res.status(500).json({ message: 'Impossible de créer le compte pour le moment' });
  }
});

router.post('/account/login', authRateLimit, async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const user = email ? await User.findOne({ where: { email } }) : null;
    if (!user || !(await passwordMatches(password, user))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    await createUserSession(user, res);
    return res.json({ user: serializeUser(user) });
  } catch (error) {
    console.error('Erreur lors de la connexion au compte:', error);
    return res.status(500).json({ message: 'Impossible de vous connecter pour le moment' });
  }
});

router.post('/account/logout', async (req, res) => {
  try {
    await clearUserSession(req, res);
    return res.status(204).end();
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return res.status(500).json({ message: 'Impossible de vous déconnecter pour le moment' });
  }
});

router.get('/account/me', (req, res) => {
  return res.json({ user: req.user ? serializeUser(req.user) : null });
});

router.get('/account/lists', requireUser, async (req, res) => {
  try {
    const lists = await SharedList.findAll({
      where: { ownerId: req.user.id },
      order: [['updatedAt', 'DESC']],
      attributes: ['slug', 'title', 'occasion', 'audienceLabel', 'gifts', 'createdAt', 'updatedAt']
    });
    return res.json({
      lists: lists.map(list => ({
        slug: list.slug,
        title: list.title,
        occasion: list.occasion,
        audienceLabel: list.audienceLabel,
        giftCount: Array.isArray(list.gifts) ? list.gifts.length : 0,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt
      }))
    });
  } catch (error) {
    console.error('Erreur lors du chargement des listes du compte:', error);
    return res.status(500).json({ message: 'Impossible de charger vos listes' });
  }
});

export default router;
