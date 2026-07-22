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

const trimText = (value, maximumLength) => String(value || '').trim().slice(0, maximumLength);

const normalizeAffiliateUrl = (value) => {
  try {
    const parsedUrl = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.toString().slice(0, 2000) : '';
  } catch {
    return '';
  }
};

const applyAffiliateTemplate = (destination, query, template) => {
  const cleanTemplate = trimText(template, 2000);
  if (!cleanTemplate || !cleanTemplate.includes('{url}')) {
    return { url: destination, isAffiliate: false };
  }

  const affiliateUrl = cleanTemplate
    .replaceAll('{url}', encodeURIComponent(destination))
    .replaceAll('{query}', encodeURIComponent(query));
  const normalizedUrl = normalizeAffiliateUrl(affiliateUrl);
  return normalizedUrl
    ? { url: normalizedUrl, isAffiliate: true }
    : { url: destination, isAffiliate: false };
};

export const buildShoppingLinks = (giftName) => {
  const encodedName = encodeURIComponent(giftName);
  const amazonUrl = new URL(`https://www.amazon.fr/s?k=${encodedName}`);
  const amazonTag = trimText(process.env.AMAZON_AFFILIATE_TAG, 64);
  if (/^[A-Za-z0-9-]+$/.test(amazonTag)) {
    amazonUrl.searchParams.set('tag', amazonTag);
  }

  const fnacDestination = `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodedName}`;
  const cdiscountDestination = `https://www.cdiscount.com/search/10/${encodedName}.html`;
  const fnacLink = applyAffiliateTemplate(
    fnacDestination,
    giftName,
    process.env.FNAC_AFFILIATE_URL_TEMPLATE
  );
  const cdiscountLink = applyAffiliateTemplate(
    cdiscountDestination,
    giftName,
    process.env.CDISCOUNT_AFFILIATE_URL_TEMPLATE
  );

  return [
    {
      merchant: 'Amazon.fr',
      label: 'Rechercher sur Amazon',
      url: amazonUrl.toString(),
      isAffiliate: amazonUrl.searchParams.has('tag')
    },
    { merchant: 'Fnac', label: 'Rechercher sur Fnac', ...fnacLink },
    { merchant: 'Cdiscount', label: 'Rechercher sur Cdiscount', ...cdiscountLink }
  ];
};

export const normalizeGifts = (gifts) => {
  if (!Array.isArray(gifts)) {
    return [];
  }

  return gifts
    .slice(0, 20)
    .map((gift) => {
      const name = trimText(gift?.name, 120);
      return {
        name,
        description: trimText(gift?.description, 300),
        reason: trimText(gift?.reason, 240),
        budgetLabel: trimText(gift?.budgetLabel, 80),
        shoppingLinks: name ? buildShoppingLinks(name) : []
      };
    })
    .filter((gift) => gift.name);
};

const enrichPublicList = (sharedList) => {
  const publicList = toPublicSharedList(sharedList);
  return {
    ...publicList,
    publicId: publicList.slug,
    gifts: publicList.gifts.map(gift => ({
      ...gift,
      shoppingLinks: buildShoppingLinks(gift.name)
    }))
  };
};

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
        list: enrichPublicList(sharedList),
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
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(enrichPublicList(sharedList));
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
    return res.json({ list: enrichPublicList(sharedList) });
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
