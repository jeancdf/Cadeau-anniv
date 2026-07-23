import assert from 'node:assert/strict';
import test from 'node:test';
import { buildStatsSnapshot, getSharedGiftId, parseBudgetEstimate } from '../services/stats-utils.js';
import { normalizeSharedGifts } from '../services/shared-list-utils.js';

test('parseBudgetEstimate reads an AI range or a single estimated price', () => {
  assert.deepEqual(parseBudgetEstimate('Environ 30 à 60 euros'), { minimum: 30, maximum: 60 });
  assert.deepEqual(parseBudgetEstimate('Autour de 49,90 €'), { minimum: 49.9, maximum: 49.9 });
  assert.equal(parseBudgetEstimate('Budget à préciser'), null);
});

test('getSharedGiftId keeps stored identifiers and deterministically identifies legacy gifts', () => {
  assert.equal(getSharedGiftId('liste-test', { id: 'gift_12345678', name: 'Livre' }, 0), 'gift_12345678');
  assert.equal(
    getSharedGiftId('liste-test', { name: 'Livre' }, 0),
    getSharedGiftId('liste-test', { name: 'Livre' }, 0)
  );
});

test('normalizeSharedGifts keeps valid identifiers unique inside a list', () => {
  const gifts = normalizeSharedGifts([
    { id: 'gift_duplicate', name: 'Premier cadeau' },
    { id: 'gift_duplicate', name: 'Deuxième cadeau' }
  ]);

  assert.equal(gifts[0].id, 'gift_duplicate');
  assert.notEqual(gifts[1].id, 'gift_duplicate');
  assert.notEqual(gifts[0].id, gifts[1].id);
});

test('buildStatsSnapshot aggregates lists, AI budgets and clicks per individual gift', () => {
  const lists = [{
    id: 7,
    slug: 'anniversaire-lea',
    title: 'Anniversaire de Léa',
    gifts: [
      { id: 'gift_ceramique', name: 'Atelier céramique', budgetLabel: '40 à 80 €' },
      { id: 'gift_livrephoto', name: 'Livre photo', budgetLabel: 'Environ 30 €' }
    ]
  }];
  const clicks = [
    {
      sharedListId: 7,
      giftId: 'gift_ceramique',
      merchant: 'Amazon.fr',
      isAffiliate: true
    },
    {
      sharedListId: 7,
      giftId: 'gift_ceramique',
      merchant: 'Amazon.fr',
      isAffiliate: true
    },
    {
      sharedListId: 7,
      giftId: 'gift_livrephoto',
      merchant: 'fnac.com',
      isAffiliate: false
    }
  ];

  const snapshot = buildStatsSnapshot(lists, clicks);

  assert.deepEqual(snapshot.summary, {
    lists: 1,
    gifts: 2,
    clicks: 3,
    affiliateClicks: 2
  });
  assert.equal(snapshot.budget.averageEstimatedPrice, 45);
  assert.equal(snapshot.budget.estimatedMinimumTotal, 70);
  assert.equal(snapshot.budget.estimatedMaximumTotal, 110);
  assert.equal(snapshot.gifts[0].giftName, 'Atelier céramique');
  assert.equal(snapshot.gifts[0].clicks, 2);
  assert.deepEqual(snapshot.gifts[0].merchants, [{ merchant: 'Amazon.fr', clicks: 2 }]);
});
