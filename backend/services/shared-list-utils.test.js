import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEditToken,
  editTokensMatch,
  hashEditToken,
  normalizeSharedListPayload,
  validateSlug
} from './shared-list-utils.js';
import { assertPublicProductUrl, extractProductMetadata } from './product-preview.js';

test('normalise un slug français et refuse les slugs réservés', () => {
  assert.equal(validateSlug(' Anniversaire de Léa '), 'anniversaire-de-lea');
  assert.throws(() => validateSlug('api'), /réservé/);
});

test('valide et borne le contenu publié', () => {
  const payload = normalizeSharedListPayload({
    title: 'Les cadeaux de Léa',
    slug: 'lea-30-ans',
    occasion: 'Anniversaire',
    gifts: [{ name: 'Un appareil photo', productUrl: 'https://example.com/photo' }]
  }, { requireSlug: true });

  assert.equal(payload.slug, 'lea-30-ans');
  assert.equal(payload.gifts[0].productUrl, 'https://example.com/photo');
  assert.throws(() => normalizeSharedListPayload({ title: '', gifts: [] }), /titre/);
});

test('compare le secret d’édition sans stocker sa valeur brute', () => {
  const token = createEditToken();
  const hash = hashEditToken(token);
  assert.notEqual(token, hash);
  assert.equal(editTokensMatch(token, hash), true);
  assert.equal(editTokensMatch('mauvais-secret', hash), false);
});

test('extrait les métadonnées Open Graph et résout une image relative', () => {
  const metadata = extractProductMetadata(`
    <html><head>
      <meta property="og:title" content="Le beau cadeau &amp; sa boîte">
      <meta property="og:image" content="/images/cadeau.webp">
    </head></html>
  `, new URL('https://shop.example.com/produit/1'));

  assert.equal(metadata.title, 'Le beau cadeau & sa boîte');
  assert.equal(metadata.imageUrl, 'https://shop.example.com/images/cadeau.webp');
});

test('refuse une cible réseau privée avant tout téléchargement', async () => {
  await assert.rejects(() => assertPublicProductUrl('http://127.0.0.1/private'), /ne peut pas/);
  await assert.rejects(() => assertPublicProductUrl('http://localhost/private'), /ne peut pas/);
});
