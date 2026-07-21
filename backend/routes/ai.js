import express from 'express';

const router = express.Router();

router.post('/ai/generate', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt || prompt.length > 30000) {
    return res.status(400).json({ message: 'Le prompt est vide ou trop long' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  if (!apiKey) {
    return res.status(503).json({ message: 'Le service IA n’est pas configuré' });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Erreur Gemini:', response.status, data?.error?.message || 'Réponse invalide');
      return res.status(502).json({ message: 'Le service IA a refusé la requête' });
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || '')
      .join('')
      .trim();
    if (!text) {
      return res.status(502).json({ message: 'Le service IA a renvoyé une réponse vide' });
    }

    res.json({ text });
  } catch (error) {
    console.error('Erreur lors de l’appel Gemini:', error);
    const status = error?.name === 'TimeoutError' ? 504 : 502;
    res.status(status).json({ message: 'Le service IA est temporairement indisponible' });
  }
});

export default router;
