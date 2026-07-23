import crypto from 'crypto';

const safeNumber = (value) => {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000 ? parsed : null;
};

export const parseBudgetEstimate = (budgetLabel) => {
  const values = String(budgetLabel || '')
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map(safeNumber)
    .filter(value => value !== null)
    .slice(0, 2) || [];

  if (!values.length) {
    return null;
  }

  const minimum = values[0];
  const maximum = values.length > 1 ? values[1] : values[0];
  return {
    minimum: Math.min(minimum, maximum),
    maximum: Math.max(minimum, maximum)
  };
};

export const normalizeGiftId = (value) => {
  const giftId = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(giftId) ? giftId : '';
};

export const createGiftId = () => crypto.randomUUID();

export const getSharedGiftId = (slug, gift, index) => {
  const existingId = normalizeGiftId(gift?.id);
  if (existingId) {
    return existingId;
  }

  const seed = `${String(slug || '')}:${index}:${String(gift?.name || '')}`;
  return `legacy_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24)}`;
};

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

const plainValue = (record) => (
  typeof record?.toJSON === 'function' ? record.toJSON() : record
);

export const buildStatsSnapshot = (listRecords, clickRecords) => {
  const lists = Array.isArray(listRecords) ? listRecords.map(plainValue) : [];
  const clicks = Array.isArray(clickRecords) ? clickRecords.map(plainValue) : [];
  const clicksByGift = new Map();
  const clicksByMerchant = new Map();

  for (const click of clicks) {
    const giftKey = `${click.sharedListId}:${click.giftId}`;
    const giftStats = clicksByGift.get(giftKey) || { total: 0, merchants: new Map() };
    giftStats.total += 1;
    giftStats.merchants.set(
      click.merchant,
      (giftStats.merchants.get(click.merchant) || 0) + 1
    );
    clicksByGift.set(giftKey, giftStats);

    const merchantStats = clicksByMerchant.get(click.merchant) || {
      merchant: click.merchant,
      clicks: 0,
      affiliateClicks: 0
    };
    merchantStats.clicks += 1;
    if (click.isAffiliate) {
      merchantStats.affiliateClicks += 1;
    }
    clicksByMerchant.set(click.merchant, merchantStats);
  }

  let estimatedMinimumTotal = 0;
  let estimatedMaximumTotal = 0;
  let giftsWithEstimate = 0;
  const gifts = [];

  for (const list of lists) {
    const listGifts = Array.isArray(list.gifts) ? list.gifts : [];
    listGifts.forEach((gift, index) => {
      const giftId = getSharedGiftId(list.slug, gift, index);
      const estimate = parseBudgetEstimate(gift.budgetLabel);
      if (estimate) {
        giftsWithEstimate += 1;
        estimatedMinimumTotal += estimate.minimum;
        estimatedMaximumTotal += estimate.maximum;
      }

      const clickStats = clicksByGift.get(`${list.id}:${giftId}`);
      gifts.push({
        giftId,
        giftName: String(gift.name || ''),
        listSlug: String(list.slug || ''),
        listTitle: String(list.title || ''),
        budgetLabel: String(gift.budgetLabel || ''),
        estimatedMinimum: estimate?.minimum ?? null,
        estimatedMaximum: estimate?.maximum ?? null,
        clicks: clickStats?.total || 0,
        merchants: clickStats
          ? [...clickStats.merchants.entries()]
            .map(([merchant, merchantClicks]) => ({ merchant, clicks: merchantClicks }))
            .sort((left, right) => right.clicks - left.clicks || left.merchant.localeCompare(right.merchant, 'fr'))
          : []
      });
    });
  }

  gifts.sort((left, right) => (
    right.clicks - left.clicks
      || left.listTitle.localeCompare(right.listTitle, 'fr')
      || left.giftName.localeCompare(right.giftName, 'fr')
  ));

  const giftCount = gifts.length;
  const averageEstimatedPrice = giftsWithEstimate
    ? (estimatedMinimumTotal + estimatedMaximumTotal) / 2 / giftsWithEstimate
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      lists: lists.length,
      gifts: giftCount,
      clicks: clicks.length,
      affiliateClicks: clicks.filter(click => click.isAffiliate).length
    },
    budget: {
      giftsWithEstimate,
      coveragePercent: giftCount ? Math.round((giftsWithEstimate / giftCount) * 100) : 0,
      estimatedMinimumTotal: roundCurrency(estimatedMinimumTotal),
      estimatedMaximumTotal: roundCurrency(estimatedMaximumTotal),
      averageEstimatedPrice: roundCurrency(averageEstimatedPrice)
    },
    merchants: [...clicksByMerchant.values()]
      .sort((left, right) => right.clicks - left.clicks || left.merchant.localeCompare(right.merchant, 'fr')),
    gifts
  };
};
