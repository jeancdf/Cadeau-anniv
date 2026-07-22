import dns from 'dns/promises';
import net from 'net';
import { normalizeHttpUrl } from './shared-list-utils.js';

const MAX_DOCUMENT_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8_000;

const isPrivateIpv4 = (address) => {
  const parts = address.split('.').map(Number);
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || parts[0] === 0;
};

const isPrivateIpv6 = (address) => {
  const normalized = address.toLowerCase();
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe8')
    || normalized.startsWith('fe9')
    || normalized.startsWith('fea')
    || normalized.startsWith('feb')
    || normalized.startsWith('::ffff:127.')
    || normalized.startsWith('::ffff:10.')
    || normalized.startsWith('::ffff:192.168.');
};

const isPrivateAddress = (address) => {
  const version = net.isIP(address);
  return version === 4 ? isPrivateIpv4(address) : version === 6 ? isPrivateIpv6(address) : true;
};

export const assertPublicProductUrl = async (rawUrl) => {
  const normalizedUrl = normalizeHttpUrl(rawUrl, 'Le lien produit');
  if (!normalizedUrl) {
    throw new Error('Le lien produit est requis');
  }

  const parsedUrl = new URL(normalizedUrl);
  if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname.endsWith('.localhost')) {
    throw new Error('Cette adresse ne peut pas être analysée');
  }

  if (net.isIP(parsedUrl.hostname)) {
    if (isPrivateAddress(parsedUrl.hostname)) {
      throw new Error('Cette adresse ne peut pas être analysée');
    }
    return parsedUrl;
  }

  const addresses = await dns.lookup(parsedUrl.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Cette adresse ne peut pas être analysée');
  }

  return parsedUrl;
};

const readLimitedBody = async (body) => {
  if (!body) {
    return '';
  }

  const reader = body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      throw new Error('La page produit est trop volumineuse');
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
};

const decodeHtml = (value) => String(value || '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .trim();

const readAttributes = (tag) => {
  const attributes = {};
  const attributePattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = attributePattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
};

export const extractProductMetadata = (html, pageUrl) => {
  const metadata = new Map();
  const metaTags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const attributes = readAttributes(tag);
    const key = String(attributes.property || attributes.name || '').toLowerCase();
    if (key && attributes.content && !metadata.has(key)) {
      metadata.set(key, attributes.content);
    }
  }

  const titleMatch = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeHtml(
    metadata.get('og:title')
    || metadata.get('twitter:title')
    || titleMatch?.[1]
    || ''
  ).replace(/\s+/g, ' ').slice(0, 120);
  const rawImage = metadata.get('og:image') || metadata.get('twitter:image') || '';
  let imageUrl = '';

  if (rawImage) {
    try {
      imageUrl = normalizeHttpUrl(new URL(rawImage, pageUrl).toString(), 'L’image du produit');
    } catch {
      imageUrl = '';
    }
  }

  return { title, imageUrl };
};

export const fetchProductPreview = async (rawUrl) => {
  let currentUrl = await assertPublicProductUrl(rawUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; GiftFinderPreview/1.0)'
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error('La page produit contient trop de redirections');
      }
      currentUrl = await assertPublicProductUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error('La page produit est inaccessible');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new Error('Le lien ne pointe pas vers une page produit');
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_DOCUMENT_BYTES) {
      throw new Error('La page produit est trop volumineuse');
    }

    const html = await readLimitedBody(response.body);
    return {
      productUrl: currentUrl.toString(),
      ...extractProductMetadata(html, currentUrl)
    };
  }

  throw new Error('Impossible d’analyser cette page produit');
};
