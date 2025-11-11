import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Only POST allowed" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ ok: false, message: "Missing prompt" });
    }

    // OpenAI Client mit deinem API-Key
    const client = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });

    // Anfrage an OpenAI — Textgenerierung
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // du kannst auch "gpt-4o" oder "gpt-3.5-turbo" nehmen
      messages: [
        {
          role: "system",
          content:
            "Du bist ein professioneller Video-Drehbuchautor. Schreibe kurze, interessante Skripte (max. 60 Sekunden) zu einem Thema.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script = response.choices[0]?.message?.content || "Fehler beim Generieren.";

    return res.status(200).json({
      ok: true,
      prompt,
      script,
    });
  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}
