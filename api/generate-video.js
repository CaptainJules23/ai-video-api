import fs from "fs";
import { execSync } from "child_process";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Only POST allowed" });
  }

  try {
    const { audioBase64, scenePrompts } = req.body;

    // Audio speichern
    const audioBuffer = Buffer.from(audioBase64, "base64");
    fs.writeFileSync("/tmp/audio.mp3", audioBuffer);

    // Szenenbilder generieren (temporär)
    // ... hier kommt der Schritt 2 Code mit OpenAI DALL·E ...

    // Video erstellen mit ffmpeg
    const ffmpegCmd = `
      ffmpeg -y -r 1/5 -i /tmp/scene%d.png -i /tmp/audio.mp3 -c:v libx264 -r 30 -pix_fmt yuv420p -c:a aac -shortest /tmp/output.mp4
    `;
    execSync(ffmpegCmd, { stdio: "inherit" });

    // Video ausgeben als Base64 oder URL
    const videoBuffer = fs.readFileSync("/tmp/output.mp4");
    const videoBase64 = videoBuffer.toString("base64");

    return res.status(200).json({ ok: true, videoBase64 });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}
