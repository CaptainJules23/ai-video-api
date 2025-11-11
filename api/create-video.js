import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    // === 1) OpenAI GPT-4o-mini: Drehbuch generieren ===
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Schreibe ein kurzes Drehbuch (ca. 60 Sekunden) für ein Social-Media-Video über: ${prompt}`
          }
        ],
      }),
    });

    const gptData = await gptResponse.json();
    const script = gptData.choices?.[0]?.message?.content || prompt;

    // === 2) Rückgabe an Client ===
    return res.status(200).json({
      ok: true,
      prompt: prompt,
      script: script
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || String(error) });
  }
}
