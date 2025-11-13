import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    // 1️⃣ Anfrage prüfen
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, message: "Only POST requests allowed" });
    }

    const { prompt } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ ok: false, message: "Missing prompt" });
    }

    // 2️⃣ Skript mit GPT-4o-mini generieren
    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Erstelle ein kurzes, spannendes Skript für ein KI-Video über folgendes Thema: ${prompt}. 
                    Verwende einfache Sprache und maximal 5 Sätze.`,
        },
      ],
    });

    const script = scriptResponse.choices[0].message.content.trim();

    // 3️⃣ Stimme mit OpenAI-TTS erzeugen
    const speechResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    // 4️⃣ Audio als Base64 zurückgeben (statt Datei)
    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    // 5️⃣ Antwort
    res.status(200).json({
      ok: true,
      prompt,
      script,
      audioBase64,
      message: "Audio und Script erfolgreich generiert",
    });
  } catch (error) {
    console.error("Fehler:", error);
    res.status(500).json({
      ok: false,
      message: error.message || "Unbekannter Serverfehler",
    });
  }
}
