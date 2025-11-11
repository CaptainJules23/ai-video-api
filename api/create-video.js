import fetch from "node-fetch";
import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.headers['x-api-secret'] !== process.env.API_SECRET) {
  return res.status(401).json({ error: 'unauthorized' });
  }
  if (req.method !== "POST") return res.status(405).end();
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  try {
    // 1) Text von GPT holen
    const gpt = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `Schreibe ein kurzes (max. 60s) Drehbuch für ein Social-Media-Video über: ${prompt}.`,
          },
        ],
      }),
    });
    const gptJson = await gpt.json();
    const script = gptJson.choices?.[0]?.message?.content ?? prompt;

    // 2) Audio erzeugen (TTS)
    const tts = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", // Standardstimme
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: script, model_id: "eleven_multilingual_v2" }),
      }
    );
    const audio = Buffer.from(await tts.arrayBuffer());

    // Audio temporär in Base64 codieren
    const audioBase64 = audio.toString("base64");

    // 3) Video generieren (Pika oder Fallback)
    const pika = await fetch("https://api.pika.art/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PIKA_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Erstelle ein kurzes Video passend zu folgendem Script: ${script}`,
        audio_base64: audioBase64,
      }),
    });
    const pikaJson = await pika.json();
    const videoUrl = pikaJson.output_url ?? null;

    // 4) YouTube-Upload
    const oauth2Client = new google.auth.OAuth2(
      process.env.YT_CLIENT_ID,
      process.env.YT_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN });
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const videoResp = await fetch(videoUrl);
    const videoBuffer = Buffer.from(await videoResp.arrayBuffer());

    const upload = await youtube.videos.insert({
      part: ["snippet,status"],
      requestBody: {
        snippet: { title: prompt, description: script.slice(0, 200) },
        status: { privacyStatus: "public" },
      },
      media: { body: videoBuffer },
    });

    return res.json({ ok: true, videoUrl, youtube: upload.data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
}
