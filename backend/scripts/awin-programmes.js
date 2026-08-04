// Liste les programmes Awin rejoints et affiche les secrets à créer.
//
// Usage : AWIN_PUBLISHER_ID=... AWIN_API_TOKEN=... npm run awin:programmes
//
// Aucune valeur n'est lue depuis un fichier ni écrite sur disque : tout vient de
// l'environnement le temps de l'appel. Le jeton n'est jamais affiché.

const AWIN_API_BASE = 'https://api.awin.com';

// Marchands déjà présents dans MERCHANT_CATALOGUE (routes/shared-lists.js) :
// seul le secret AWIN_ADVERTISER_<CLÉ> reste à créer pour eux.
const KNOWN_MERCHANT_KEYS = new Map([
  ['cdiscount.com', 'cdiscount'],
  ['s.click.aliexpress.com', 'aliexpress'],
  ['iteaworld.com', 'iteaworld'],
  ['brickzonehub.co.uk', 'brickzonehub'],
  ['store.imou.com', 'imou'],
  ['sportpartners.fr', 'sportpartners']
]);

const toDomain = (value) => {
  try {
    return new URL(String(value)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
};

// Suffixes de second niveau à retirer avant d'isoler le nom de domaine (co.uk, com.au...).
const SECOND_LEVEL_SUFFIXES = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac']);

// s.click.aliexpress.com -> aliexpress ; store.imou.com -> imou ; brickzonehub.co.uk -> brickzonehub
const toRegistrableName = (domain) => {
  const labels = domain.split('.').filter(Boolean);
  if (labels.length < 2) {
    return labels[0] || '';
  }

  labels.pop();
  if (labels.length > 1 && SECOND_LEVEL_SUFFIXES.has(labels[labels.length - 1])) {
    labels.pop();
  }
  return labels[labels.length - 1] || '';
};

const toMerchantKey = (name, domain) => {
  const source = domain ? toRegistrableName(domain) : String(name || '');
  const key = source
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return key.length >= 2 ? key : '';
};

const fetchJoinedProgrammes = async (publisherId, token) => {
  const url = `${AWIN_API_BASE}/publishers/${publisherId}/programmes?relationship=joined`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Jeton refusé (401/403). Régénérez-le sur la page « Identifiants API » d’Awin.');
  }
  if (!response.ok) {
    throw new Error(`L’API Awin a répondu ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
};

const main = async () => {
  const publisherId = String(process.env.AWIN_PUBLISHER_ID || '').trim();
  const token = String(process.env.AWIN_API_TOKEN || '').trim();

  if (!/^[0-9]{1,12}$/.test(publisherId)) {
    console.error('AWIN_PUBLISHER_ID manquant ou invalide.');
    console.error('Usage : AWIN_PUBLISHER_ID=... AWIN_API_TOKEN=... npm run awin:programmes');
    process.exit(1);
  }
  if (!token) {
    console.error('AWIN_API_TOKEN manquant.');
    console.error('Usage : AWIN_PUBLISHER_ID=... AWIN_API_TOKEN=... npm run awin:programmes');
    process.exit(1);
  }

  const programmes = await fetchJoinedProgrammes(publisherId, token);
  if (!programmes.length) {
    console.log('Aucun programme au statut « joined ». Les demandes en attente ne rapportent rien.');
    return;
  }

  console.log(`\n${programmes.length} programme(s) rejoint(s) :\n`);
  const secrets = [];
  const newMerchants = [];

  for (const programme of programmes) {
    const advertiserId = String(programme?.id ?? '').trim();
    const name = String(programme?.name || '').trim();
    const domain = toDomain(programme?.displayUrl || programme?.clickThroughUrl);
    const knownKey = KNOWN_MERCHANT_KEYS.get(domain);
    const key = knownKey || toMerchantKey(name, domain);

    console.log(`  ${advertiserId.padEnd(8)} ${name.padEnd(34)} ${domain || '—'}`);

    if (!/^[0-9]{1,12}$/.test(advertiserId) || !key) {
      continue;
    }

    secrets.push({ name: `AWIN_ADVERTISER_${key.toUpperCase().replaceAll('-', '_')}`, advertiserId });
    if (!knownKey) {
      newMerchants.push({ key, merchant: name, domain });
    }
  }

  console.log('\nSecrets GitHub à créer (Settings → Secrets and variables → Actions) :\n');
  console.log(`  AWIN_PUBLISHER_ID  = ${publisherId}`);
  for (const secret of secrets) {
    console.log(`  ${secret.name.padEnd(34)} = ${secret.advertiserId}`);
  }

  if (newMerchants.length) {
    console.log(
      `\n⚠️  ${newMerchants.length} marchand(s) absent(s) du catalogue. Ajoutez ces entrées dans`
      + ' MERCHANT_CATALOGUE (backend/routes/shared-lists.js), en complétant searchUrl :\n'
    );
    for (const merchant of newMerchants) {
      console.log(`  {`);
      console.log(`    key: '${merchant.key}',`);
      console.log(`    merchant: '${merchant.merchant.replaceAll("'", "\\'")}',`);
      console.log(`    searchUrl: 'https://${merchant.domain || 'exemple.com'}/A_COMPLETER?q={query}'`);
      console.log(`  },`);
    }
    console.log(
      '\n   Pour trouver searchUrl : lancez une recherche sur le site du marchand et copiez'
      + ' l’URL obtenue, en remplaçant le mot cherché par {query}.'
    );
  }
};

main().catch((error) => {
  console.error(`Échec : ${error.message}`);
  process.exit(1);
});
