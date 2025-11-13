import OpenAI from "openai";
import fs from "fs";
import { execSync } from "child_process";

const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// --- Szenen aus Skript extrahieren ---
function extractScenePrompts(script) {
  const lines = script.split("\n");
  const prompts = [];

  for (let line of lines) {
    line = line.trim();
    if (line.toLowerCase().includes("szene") && line.includes(":")) {
      const prompt = line.split(":")[1].trim();
      if (prompt) prompts.push(prompt + ", cinematic, high detail");
    }
  }

  return prompts;
}

// --- Bilder generieren ---
async function generateSceneImages(scenes) {
  const imagePaths = [];
  for (let i = 0; i < scenes.length; i++) {
    const prompt = scenes[i];
    const result = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });
    const imageBase64 = result.data[0].b64_json;
    const buffer = Buffer.from(imageBase64, "base64");
    const filePath = `/tmp/scene${i + 1}.png`;
    fs.writeFileSync(filePath, buffer);
    imagePaths.push(filePath);
  }
  return imagePaths;
}

// --- Video aus Bildern + Audio ---
function createVideo(imagePaths, audioPath) {
  const ffmpegCmd = `
    npx @ffmpeg-installer/ffmpeg -y -r 1/5 -i /tmp/scene%d.png -i ${audioPath} -c:v libx264 -r 30 -pix_fmt yuv420p -c:a aac -shortest /tmp/output.mp4
  `;
  execSync(ffmpegCmd, { stdio: "inherit" });

  const videoBuffer = fs.readFileSync("/tmp/output.mp4");
  return videoBuffer.toString("base64");
}

// --- Vercel Function ---
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Only POST allowed" });
  }

  try {
    const { audioBase64, script } = req.body;

    if (!audioBase64 || !script) {
      return res.status(400).json({ ok: false, message: "Missing audioBase64 or script" });
    }

    // Audio temporär speichern
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync("/tmp/audio.mp3", audioBuffer);

    // Szenen automatisch extrahieren
    const scenePrompts = extractScenePrompts(script);

    // Szenenbilder generieren
    const imagePaths = await generateSceneImages(scenePrompts);

    // Video erstellen
    const videoBase64 = createVideo(imagePaths, "/tmp/audio.mp3");

    return res.status(200).json({ ok: true, videoBase64 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}
