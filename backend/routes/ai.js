import express from 'express';

const router = express.Router();

const DEFAULT_QWEN_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_QWEN_MODEL = 'qwen/qwen3.7-plus';
const MAX_ATTEMPTS = 2;
const CHAT_WINDOW_MS = 10 * 60 * 1000;
const CHAT_REQUEST_LIMIT = 30;
const chatUsageByIp = new Map();

const audienceLabels = {
  self: 'pour la personne qui utilise le site',
  other: 'pour un proche de la personne qui utilise le site'
};

const startModeLabels = {
  ideas: 'la personne a deja quelques idees',
  describe: 'la personne veut decrire librement le destinataire',
  guide: 'la personne souhaite que tu menes la conversation avec des questions',
  surprise: 'la personne part de zero et souhaite etre guidee'
};

const parseJsonObject = (content) => {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readResponseBody = async (response) => {
  const rawBody = await response.text();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    return { rawBody };
  }
};

const enforceChatRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const currentUsage = chatUsageByIp.get(key);

  if (!currentUsage || currentUsage.resetAt <= now) {
    chatUsageByIp.set(key, { count: 1, resetAt: now + CHAT_WINDOW_MS });
    return next();
  }

  if (currentUsage.count >= CHAT_REQUEST_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((currentUsage.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Trop de messages envoyes. Reessayez dans quelques minutes.' });
  }

  currentUsage.count += 1;
  return next();
};

const normalizeChatMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .slice(-20)
    .filter((message) => message?.role === 'user' || message?.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: String(message.content || '').trim().slice(0, 2000)
    }))
    .filter((message) => message.content);
};

const normalizeSelectedGifts = (selectedGifts) => {
  if (!Array.isArray(selectedGifts)) {
    return [];
  }

  return selectedGifts
    .slice(0, 20)
    .map((gift) => ({
      name: String(gift?.name || '').trim().slice(0, 120),
      description: String(gift?.description || '').trim().slice(0, 300),
      budgetLabel: String(gift?.budgetLabel || '').trim().slice(0, 80)
    }))
    .filter((gift) => gift.name);
};

const normalizeChatResponse = (content) => {
  const parsed = parseJsonObject(content);
  const message = String(parsed?.message || '').trim().slice(0, 4000);
  if (!message) {
    return null;
  }

  const quickReplies = Array.isArray(parsed.quickReplies)
    ? parsed.quickReplies
      .filter((reply) => typeof reply === 'string' && reply.trim())
      .map((reply) => reply.trim().slice(0, 80))
      .slice(0, 4)
    : [];

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions
      .map((suggestion) => ({
        name: String(suggestion?.name || '').trim().slice(0, 120),
        description: String(suggestion?.description || '').trim().slice(0, 300),
        reason: String(suggestion?.reason || '').trim().slice(0, 240),
        budgetLabel: String(suggestion?.budgetLabel || '').trim().slice(0, 80)
      }))
      .filter((suggestion) => suggestion.name && suggestion.description)
      .slice(0, 4)
    : [];

  return {
    message,
    quickReplies,
    suggestions,
    profileSummary: String(parsed?.profileSummary || '').trim().slice(0, 500)
  };
};

const requestQwen = async ({ apiKey, baseUrl, model, messages, maxTokens = 1600 }) => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.PUBLIC_APP_URL || 'https://gift-finder.duckdns.org',
      'X-Title': 'Gift Finder'
    },
    body: JSON.stringify({
      model,
      messages,
      reasoning: { enabled: false },
      response_format: { type: 'json_object' },
      temperature: 0.72,
      max_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(45000)
  });

  const data = await readResponseBody(response);
  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.message || data?.rawBody || 'Reponse invalide';
    console.error('Erreur Qwen:', response.status, providerMessage);
    const error = new Error('Le service IA a refuse la requete');
    error.statusCode = 502;
    throw error;
  }

  const rawContent = data?.choices?.[0]?.message?.content;
  return typeof rawContent === 'string' ? rawContent.trim() : '';
};

router.post('/ai/chat', enforceChatRateLimit, async (req, res) => {
  const profile = req.body?.profile || {};
  const audience = audienceLabels[profile.audience];
  const occasion = String(profile.occasion || '').trim().slice(0, 80);
  const startMode = startModeLabels[profile.startMode];
  const messages = normalizeChatMessages(req.body?.messages);
  const selectedGifts = normalizeSelectedGifts(req.body?.selectedGifts);
  const previousProfileSummary = String(req.body?.profileSummary || '').trim().slice(0, 500);

  if (!audience || !occasion || !startMode || !messages.length || messages.at(-1)?.role !== 'user') {
    return res.status(400).json({ message: 'Le contexte de conversation est incomplet' });
  }

  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL;
  const baseUrl = (process.env.QWEN_BASE_URL || DEFAULT_QWEN_BASE_URL).replace(/\/+$/, '');
  if (!apiKey) {
    return res.status(503).json({ message: 'Le service IA n’est pas configure' });
  }

  const systemPrompt = `
Tu es Gift Finder, un copilote conversationnel francophone qui aide a construire une liste de cadeaux personnelle.

Contexte de depart:
- La liste est creee ${audience}.
- Occasion: ${occasion}.
- Mode choisi: ${startMode}.
- Resume acquis lors des tours precedents: ${JSON.stringify(previousProfileSummary || 'aucun pour le moment')}.
- Idees deja ajoutees a la liste: ${JSON.stringify(selectedGifts)}.

Regles de conversation:
1. Reponds naturellement en francais, chaleureusement et sans jargon.
2. Il ne s'agit PAS d'un questionnaire fixe. La personne peut parler librement, demander des suggestions ou te demander de la guider.
3. Si elle souhaite etre guidee et qu'une information importante manque, pose UNE seule question utile dans ce tour. Propose alors 2 a 4 reponses rapides, mais accepte toujours une reponse libre.
4. Ne repose pas une question dont la reponse existe deja dans l'historique.
5. Des que tu as assez de contexte, propose 2 a 4 idees concretes au lieu de continuer a interroger.
6. Tu peux melanger une courte reformulation, des idees et une question d'affinage si cela fait avancer la conversation.
7. Si une idee est refusee, tiens compte de la raison et change reellement de piste.
8. N'invente jamais de lien marchand, de disponibilite, de marque precise ou de prix exact. Donne seulement une fourchette de budget indicative.
9. Evite les stereotypes lies a l'age, au genre ou a la relation. Base-toi sur les informations donnees.
10. Le champ profileSummary doit resumer en une phrase ce qui est compris. Mets-le a jour progressivement.

Reponds UNIQUEMENT avec cet objet JSON valide, sans Markdown:
{
  "message": "reponse conversationnelle courte",
  "quickReplies": ["reponse rapide facultative"],
  "profileSummary": "resume evolutif du destinataire et de ses preferences",
  "suggestions": [
    {
      "name": "concept de cadeau",
      "description": "description concrete et concise",
      "reason": "raison personnalisee",
      "budgetLabel": "ex: Environ 30 a 60 euros"
    }
  ]
}

Si tu poses une question exploratoire, suggestions peut etre vide. Si tu proposes des cadeaux, quickReplies peut contenir des pistes d'affinage.
  `.trim();

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const content = await requestQwen({
        apiKey,
        baseUrl,
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      });
      const normalizedResponse = normalizeChatResponse(content);
      if (normalizedResponse) {
        return res.json(normalizedResponse);
      }
      console.warn(`Reponse conversationnelle Qwen invalide (tentative ${attempt}/${MAX_ATTEMPTS})`);
    }

    return res.status(502).json({ message: 'Le service IA a renvoye une reponse invalide' });
  } catch (error) {
    console.error('Erreur lors du chat Qwen:', error);
    const status = error?.name === 'TimeoutError' ? 504 : (error?.statusCode || 502);
    return res.status(status).json({ message: 'Le service IA est temporairement indisponible' });
  }
});

router.post('/ai/generate', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || prompt.length > 30000) {
    return res.status(400).json({ message: 'Le prompt est vide ou trop long' });
  }

  const apiKey = process.env.QWEN_API_KEY;
  const model = process.env.QWEN_MODEL || DEFAULT_QWEN_MODEL;
  const baseUrl = (process.env.QWEN_BASE_URL || DEFAULT_QWEN_BASE_URL).replace(/\/+$/, '');
  if (!apiKey) {
    return res.status(503).json({ message: 'Le service IA n’est pas configuré' });
  }

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Tu proposes des cadeaux pertinents en français. Réponds uniquement avec un objet JSON valide conforme au format demandé, sans Markdown.'
            },
            { role: 'user', content: prompt }
          ],
          reasoning: { enabled: false },
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 2000
        }),
        signal: AbortSignal.timeout(45000)
      });

      const data = await readResponseBody(response);
      if (!response.ok) {
        console.error(
          'Erreur Qwen:',
          response.status,
          data?.error?.message || data?.message || data?.rawBody || 'Réponse invalide'
        );
        return res.status(502).json({ message: 'Le service IA a refusé la requête' });
      }

      const rawContent = data?.choices?.[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent.trim() : '';
      const parsedContent = content ? parseJsonObject(content) : null;
      if (parsedContent) {
        return res.json({ text: JSON.stringify(parsedContent) });
      }

      console.warn(`Réponse JSON Qwen invalide ou vide (tentative ${attempt}/${MAX_ATTEMPTS})`);
    }

    return res.status(502).json({ message: 'Le service IA a renvoyé une réponse invalide' });
  } catch (error) {
    console.error('Erreur lors de l’appel Qwen:', error);
    const status = error?.name === 'TimeoutError' ? 504 : 502;
    return res.status(status).json({ message: 'Le service IA est temporairement indisponible' });
  }
});

export default router;
