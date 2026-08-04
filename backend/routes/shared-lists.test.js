import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DB_HOST ||= 'localhost';
process.env.DB_NAME ||= 'gift_finder_test';
process.env.DB_USER ||= 'gift_finder_test';
process.env.DB_PASSWORD ||= 'gift_finder_test';

const { buildShoppingLinks, normalizeGifts } = await import('./shared-lists.js');

const MERCHANT_KEYS = ['cdiscount', 'aliexpress', 'iteaworld', 'brickzonehub', 'imou', 'sportpartners'];

const resetAffiliateEnv = () => {
  delete process.env.AWIN_PUBLISHER_ID;
  for (const key of MERCHANT_KEYS) {
    delete process.env[`AWIN_ADVERTISER_${key.toUpperCase()}`];
  }
};

test('buildShoppingLinks exposes every joined programme, unaffiliated by default', () => {
  resetAffiliateEnv();

  const links = buildShoppingLinks('Casque audio');

  assert.deepEqual(links.map(link => link.trackingKey), MERCHANT_KEYS);
  assert.ok(links.every(link => link.isAffiliate === false));
  assert.ok(links.every(link => /^https:\/\//.test(link.url)));
  assert.ok(links.every(link => !link.url.includes('{query}')));
});

test('buildShoppingLinks builds an Awin deep link from one secret per advertiser', () => {
  resetAffiliateEnv();
  process.env.AWIN_PUBLISHER_ID = '2997877';
  process.env.AWIN_ADVERTISER_CDISCOUNT = '6948';

  const links = buildShoppingLinks('Casque audio', 'legacy_abc123');
  const cdiscount = links.find(link => link.trackingKey === 'cdiscount');
  const deepLink = new URL(cdiscount.url);

  assert.equal(cdiscount.isAffiliate, true);
  assert.equal(deepLink.hostname, 'www.awin1.com');
  assert.equal(deepLink.searchParams.get('awinmid'), '6948');
  assert.equal(deepLink.searchParams.get('awinaffid'), '2997877');
  assert.equal(deepLink.searchParams.get('clickref'), 'legacy_abc123');
  assert.equal(
    deepLink.searchParams.get('ued'),
    'https://www.cdiscount.com/search/10/Casque%20audio.html'
  );

  // Les programmes sans secret restent en lien direct, non affilié.
  assert.ok(links.filter(link => link.trackingKey !== 'cdiscount').every(link => !link.isAffiliate));
});

test('buildShoppingLinks keeps merchant keys and env variable names aligned', () => {
  resetAffiliateEnv();
  process.env.AWIN_PUBLISHER_ID = '2997877';
  process.env.AWIN_ADVERTISER_ALIEXPRESS = '26009';
  process.env.AWIN_ADVERTISER_SPORTPARTNERS = '127959';

  const affiliated = buildShoppingLinks('Ballon de foot')
    .filter(link => link.isAffiliate)
    .map(link => [link.trackingKey, new URL(link.url).searchParams.get('awinmid')]);

  assert.deepEqual(affiliated, [['aliexpress', '26009'], ['sportpartners', '127959']]);
});

test('buildShoppingLinks ignores invalid Awin configuration', () => {
  resetAffiliateEnv();
  process.env.AWIN_PUBLISHER_ID = 'pas-un-identifiant';
  process.env.AWIN_ADVERTISER_CDISCOUNT = '6948';
  assert.ok(buildShoppingLinks('Casque audio').every(link => !link.isAffiliate));

  process.env.AWIN_PUBLISHER_ID = '2997877';
  process.env.AWIN_ADVERTISER_CDISCOUNT = 'javascript:alert(1)';
  const links = buildShoppingLinks('Casque audio');
  assert.equal(links.length, MERCHANT_KEYS.length);
  assert.ok(links.every(link => !link.isAffiliate));
  assert.match(links[0].url, /^https:\/\/www\.cdiscount\.com\//);
});

test('normalizeGifts rejects empty entries and never accepts unsafe client links', () => {
  resetAffiliateEnv();
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
  assert.equal(gifts[0].shoppingLinks.length, MERCHANT_KEYS.length);
  assert.ok(gifts[0].shoppingLinks.every(link => /^https:\/\//.test(link.url)));
});
