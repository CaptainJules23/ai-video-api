import OpenAI from "openai";

export const config = {
  runtime: "edge",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, message: "Only POST allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(
        JSON.stringify({ ok: false, message: "Missing prompt" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 🧠 1️⃣ Text generieren
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Du bist ein professioneller Video-Drehbuchautor. Schreibe kurze, interessante Skripte (max. 60 Sekunden) zu einem Thema.",
        },
        { role: "user", content: prompt },
      ],
    });

    const script =
      response.choices[0]?.message?.content?.trim() ||
      "Fehler beim Generieren.";

    // 🔊 2️⃣ Audio generieren (Edge-kompatibel)
    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: script,
    });

    // 🧩 3️⃣ ArrayBuffer → Base64 (ohne Buffer)
    const arrayBuffer = await speech.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    const audioBase64 = btoa(binary);

    // ✅ 4️⃣ Ergebnis zurückgeben
    return new Response(
      JSON.stringify({
        ok: true,
        prompt,
        script,
        audioBase64,
        message: "Script und Audio erfolgreich generiert",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
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
