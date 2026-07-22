import crypto from 'crypto';
import express from 'express';
import { SharedGiftList } from '../models/sharedGiftList.js';

const router = express.Router();

const CREATE_WINDOW_MS = 15 * 60 * 1000;
const CREATE_LIMIT_PER_IP = 12;
const MAX_GIFTS = 20;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;
const createUsageByIp = new Map();

const trimText = (value, maximumLength) => String(value || '').trim().slice(0, maximumLength);

const normalizeHttpUrl = (value) => {
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
  const normalizedUrl = normalizeHttpUrl(affiliateUrl);
  return normalizedUrl
    ? { url: normalizedUrl, isAffiliate: true }
    : { url: destination, isAffiliate: false };
};

const buildShoppingLinks = (giftName) => {
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
    {
      merchant: 'Fnac',
      label: 'Rechercher sur Fnac',
      ...fnacLink
    },
    {
      merchant: 'Cdiscount',
      label: 'Rechercher sur Cdiscount',
      ...cdiscountLink
    }
  ];
};

const normalizeGifts = (gifts) => {
  if (!Array.isArray(gifts)) {
    return [];
  }

  return gifts
    .slice(0, MAX_GIFTS)
    .map((gift) => {
      const name = trimText(gift?.name, 120);
      return {
        name,
        description: trimText(gift?.description, 500),
        reason: trimText(gift?.reason, 300),
        budgetLabel: trimText(gift?.budgetLabel, 80),
        shoppingLinks: name ? buildShoppingLinks(name) : []
      };
    })
    .filter((gift) => gift.name);
};

const enforceCreateRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';

  if (createUsageByIp.size > 5000) {
    for (const [storedKey, usage] of createUsageByIp.entries()) {
      if (usage.resetAt <= now) {
        createUsageByIp.delete(storedKey);
      }
    }
  }

  const usage = createUsageByIp.get(key);
  if (!usage || usage.resetAt <= now) {
    createUsageByIp.set(key, { count: 1, resetAt: now + CREATE_WINDOW_MS });
    return next();
  }

  if (usage.count >= CREATE_LIMIT_PER_IP) {
    const retryAfter = Math.max(1, Math.ceil((usage.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Trop de listes créées. Réessayez dans quelques minutes.' });
  }

  usage.count += 1;
  return next();
};

router.post('/shared-lists', enforceCreateRateLimit, async (req, res) => {
  const occasion = trimText(req.body?.occasion, 80);
  const audienceLabel = trimText(req.body?.audienceLabel, 80);
  const gifts = normalizeGifts(req.body?.gifts);

  if (!occasion || !audienceLabel || !gifts.length) {
    return res.status(400).json({ message: 'La liste à partager est incomplète.' });
  }

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const publicId = crypto.randomBytes(12).toString('base64url').slice(0, 16);
      try {
        const sharedList = await SharedGiftList.create({ publicId, occasion, audienceLabel, gifts });
        return res.status(201).json({ publicId: sharedList.publicId });
      } catch (error) {
        if (error?.name !== 'SequelizeUniqueConstraintError' || attempt === 2) {
          throw error;
        }
      }
    }

    return res.status(500).json({ message: 'Impossible de créer le lien de partage.' });
  } catch (error) {
    console.error('Erreur lors de la création de la liste partagée:', error);
    return res.status(500).json({ message: 'Impossible de créer le lien de partage.' });
  }
});

router.get('/shared-lists/:publicId', async (req, res) => {
  const publicId = trimText(req.params.publicId, 32);
  if (!PUBLIC_ID_PATTERN.test(publicId)) {
    return res.status(400).json({ message: 'Lien de liste invalide.' });
  }

  try {
    const sharedList = await SharedGiftList.findOne({
      where: { publicId },
      attributes: ['publicId', 'occasion', 'audienceLabel', 'gifts', 'createdAt']
    });

    if (!sharedList) {
      return res.status(404).json({ message: 'Cette liste n’existe pas ou plus.' });
    }

    res.set('Cache-Control', 'public, max-age=300');
    return res.json(sharedList);
  } catch (error) {
    console.error('Erreur lors de la récupération de la liste partagée:', error);
    return res.status(500).json({ message: 'Impossible de charger cette liste.' });
  }
});

export { buildShoppingLinks, normalizeGifts };
export default router;
