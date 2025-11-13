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

    const client = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });

    // 1️⃣ Skript generieren
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
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

    const script =
      response.choices[0]?.message?.content || "Fehler beim Generieren.";

    // 2️⃣ Audio mit OpenAI TTS generieren
    const audioResponse = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // alternativ: "verse", "nova", "shimmer"
      input: script,
    });

    // Audio in Base64 umwandeln
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    // 3️⃣ Rückgabe als JSON
    return res.status(200).json({
      ok: true,
      prompt,
      script,
      audioBase64,
    });
  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}
