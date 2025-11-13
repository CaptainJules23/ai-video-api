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

    // 🔑 OpenAI Client mit deinem API-Key
    const client = new OpenAI({
      apiKey: process.env.OPENAI_KEY,
    });

    // 🧠 1️⃣ Text generieren (Skript)
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
      response.choices[0]?.message?.content?.trim() || "Fehler beim Generieren.";

    // 🔊 2️⃣ Audio generieren (TTS)
    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // Stimmen: alloy, verse, coral, etc.
      input: script,
    });

    // 🧩 3️⃣ In Base64 umwandeln
    const arrayBuffer = await speech.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString("base64");

    // ✅ 4️⃣ Ergebnis senden
    return res.status(200).json({
      ok: true,
      prompt,
      script,
      audioBase64,
      message: "Script und Audio erfolgreich generiert",
    });
  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}
