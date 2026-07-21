import express from 'express';

const router = express.Router();

const DEFAULT_QWEN_BASE_URL = 'https://dashscope-us.aliyuncs.com/compatible-mode/v1';
const DEFAULT_QWEN_MODEL = 'qwen3.7-plus';
const MAX_ATTEMPTS = 2;

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
          enable_thinking: false,
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
