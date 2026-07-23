import crypto from 'crypto';
import { createGiftId, normalizeGiftId } from './stats-utils.js';

const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'auth',
  'liste',
  'listes',
  'login',
  'nouvelle-liste',
  'health'
]);

const cleanText = (value, maximumLength) => String(value || '').trim().slice(0, maximumLength);

export const normalizeSlug = (value) => cleanText(value, 120)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60)
  .replace(/-+$/g, '');

export const validateSlug = (value) => {
  const slug = normalizeSlug(value);
  if (slug.length < 3) {
    throw new Error('Le lien personnalisé doit contenir au moins 3 caractères');
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error('Ce lien personnalisé est réservé');
  }
  return slug;
};

export const normalizeHttpUrl = (value, fieldLabel) => {
  const rawValue = cleanText(value, 2000);
  if (!rawValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(rawValue);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error();
    }
    parsedUrl.username = '';
    parsedUrl.password = '';
    return parsedUrl.toString();
  } catch {
    throw new Error(`${fieldLabel} doit être une adresse HTTP(S) valide`);
  }
};

export const normalizeSharedGifts = (gifts) => {
  if (!Array.isArray(gifts) || gifts.length === 0) {
    throw new Error('La liste doit contenir au moins un cadeau');
  }
  if (gifts.length > 20) {
    throw new Error('Une liste ne peut pas contenir plus de 20 cadeaux');
  }

  return gifts.map((gift, index) => {
    const name = cleanText(gift?.name, 120);
    if (!name) {
      throw new Error(`Le cadeau ${index + 1} doit avoir un nom`);
    }

    return {
      id: normalizeGiftId(gift?.id) || createGiftId(),
      name,
      description: cleanText(gift?.description, 300),
      reason: cleanText(gift?.reason, 240),
      budgetLabel: cleanText(gift?.budgetLabel, 80),
      productUrl: normalizeHttpUrl(gift?.productUrl, `Le lien produit du cadeau ${index + 1}`),
      imageUrl: normalizeHttpUrl(gift?.imageUrl, `L’image du cadeau ${index + 1}`)
    };
  });
};

export const normalizeSharedListPayload = (body, { requireSlug = false } = {}) => {
  const title = cleanText(body?.title, 120);
  if (!title) {
    throw new Error('Le titre de la liste est requis');
  }

  const payload = {
    title,
    occasion: cleanText(body?.occasion, 80),
    audienceLabel: cleanText(body?.audienceLabel, 80),
    gifts: normalizeSharedGifts(body?.gifts)
  };

  if (requireSlug) {
    payload.slug = validateSlug(body?.slug);
  }

  return payload;
};

export const createEditToken = () => crypto.randomBytes(32).toString('base64url');

export const hashEditToken = (token) => crypto
  .createHash('sha256')
  .update(String(token || ''))
  .digest('hex');

export const editTokensMatch = (providedToken, expectedHash) => {
  if (!providedToken || !expectedHash) {
    return false;
  }

  const providedHash = Buffer.from(hashEditToken(providedToken), 'hex');
  const storedHash = Buffer.from(String(expectedHash), 'hex');
  return providedHash.length === storedHash.length
    && crypto.timingSafeEqual(providedHash, storedHash);
};

export const toPublicSharedList = (sharedList) => {
  const source = typeof sharedList?.toJSON === 'function' ? sharedList.toJSON() : sharedList;
  return {
    slug: source.slug,
    title: source.title,
    occasion: source.occasion || '',
    audienceLabel: source.audienceLabel || '',
    gifts: Array.isArray(source.gifts) ? source.gifts : [],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt
  };
};
