import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { texts, targetLang } = req.body;
  const apiKey = process.env.VITE_DEEPL_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'DeepL API key not configured' });

  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: texts, target_lang: targetLang, source_lang: 'FR' }),
  });

  const data = await response.json();
  res.status(200).json(data);
}
