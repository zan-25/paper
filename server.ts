import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Service
  const apiCall = (apiKey: string | undefined) => {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined");
    return new GoogleGenAI({ apiKey });
  };
  
  app.post("/api/generate", async (req, res) => {
    const { topic, numQuestions, difficulty } = req.body;
    try {
      const ai = apiCall(process.env.GEMINI_API_KEY);
      const prompt = `Generate ${numQuestions} ${difficulty} level questions about ${topic}. Format the response as a JSON array of strings.`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const responseText = result.text;
      // Simple cleaning, in case the model returns markdown or wrapping
      const cleanedText = (responseText || '').replace(/```json/g, '').replace(/```/g, '').trim();
      res.json({ questions: JSON.parse(cleanedText) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
