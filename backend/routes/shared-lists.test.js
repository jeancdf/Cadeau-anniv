import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DB_HOST ||= 'localhost';
process.env.DB_NAME ||= 'gift_finder_test';
process.env.DB_USER ||= 'gift_finder_test';
process.env.DB_PASSWORD ||= 'gift_finder_test';

const { buildShoppingLinks, normalizeGifts } = await import('./shared-lists.js');

test('buildShoppingLinks adds a validated Amazon affiliate tag', () => {
  process.env.AMAZON_AFFILIATE_TAG = 'giftfinder-21';
  delete process.env.FNAC_AFFILIATE_URL_TEMPLATE;
  delete process.env.CDISCOUNT_AFFILIATE_URL_TEMPLATE;

  const links = buildShoppingLinks('Album photo personnalisé');
  const amazonUrl = new URL(links[0].url);

  assert.equal(links.length, 3);
  assert.equal(links[0].isAffiliate, true);
  assert.equal(amazonUrl.searchParams.get('tag'), 'giftfinder-21');
  assert.equal(amazonUrl.searchParams.get('k'), 'Album photo personnalisé');
});

test('buildShoppingLinks applies a safe Awin-style redirect template', () => {
  delete process.env.AMAZON_AFFILIATE_TAG;
  process.env.FNAC_AFFILIATE_URL_TEMPLATE = 'https://www.awin1.com/cread.php?awinmid=123&awinaffid=456&ued={url}';

  const fnacLink = buildShoppingLinks('Casque audio')[1];
  const affiliateUrl = new URL(fnacLink.url);

  assert.equal(fnacLink.isAffiliate, true);
  assert.equal(affiliateUrl.hostname, 'www.awin1.com');
  assert.match(affiliateUrl.searchParams.get('ued') || '', /^https:\/\/www\.fnac\.com\//);
});

test('normalizeGifts rejects empty entries and never accepts unsafe client links', () => {
  const gifts = normalizeGifts([
    {
      name: '  Atelier céramique  ',
      description: 'Une expérience à partager',
      reason: 'Un souvenir durable',
      budgetLabel: '40 à 80 €',
      shoppingLinks: [{ url: 'javascript:alert(1)' }]
    },
    { name: '   ' }
  ]);

  assert.equal(gifts.length, 1);
  assert.equal(gifts[0].name, 'Atelier céramique');
  assert.equal(gifts[0].shoppingLinks.length, 3);
  assert.ok(gifts[0].shoppingLinks.every(link => /^https:\/\//.test(link.url)));
});
