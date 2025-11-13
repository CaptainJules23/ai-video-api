import OpenAI from "openai";

export const config = {
  runtime: "edge",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, message: "Only POST requests allowed" }),
        { status: 405 }
      );
    }

    const body = await req.json();
    const prompt = body?.prompt;
    if (!prompt) {
      return new Response(
        JSON.stringify({ ok: false, message: "Missing prompt" }),
        { status: 400 }
      );
    }

    // 1️⃣ Script generieren
    const scriptResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Erstelle ein kurzes, spannendes Skript für ein KI-Video über folgendes Thema: ${prompt}. Verwende einfache Sprache und maximal 5 Sätze.`,
        },
      ],
    });

    const script = scriptResponse.choices[0].message.content.trim();

    // 2️⃣ Stimme erzeugen (TTS)
    const speechResponse = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    // ⚙️ In Base64 konvertieren (Edge-kompatibel)
    const arrayBuffer = await speechResponse.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    const audioBase64 = btoa(binary);

    return new Response(
      JSON.stringify({
        ok: true,
        prompt,
        script,
        audioBase64,
        message: "Audio und Script erfolgreich generiert",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Fehler:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        message: error.message || "Unbekannter Serverfehler",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
