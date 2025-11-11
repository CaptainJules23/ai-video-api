export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests allowed' });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  // Minimaler Test: einfach zurückgeben, was wir bekommen
  return res.status(200).json({
    ok: true,
    message: `Prompt received: ${prompt}`
  });
}
