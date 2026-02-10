// controllers/aiController.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Initialize genAI using your environment variable
// (Ensure your index.js still has import 'dotenv/config' at line 1)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const askGemini = async (req, res) => {
  try {
    const { prompt } = req.body;

    // 2. Add debug logs to verify state
    // console.log("[Request Arrived]: POST /ai/generate");
    // console.log("🤖 Backend received prompt:", prompt);

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ BACKEND ERROR: GEMINI_API_KEY is undefined!");
      return res.status(500).json({ success: false, message: "API key missing" });
    }

    // console.log("🔑 Using API Key starting with:", process.env.GEMINI_API_KEY.substring(0, 5));

    // 3. Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 4. Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ success: true, text });

  } catch (error) {
    // 5. Catching errors to prevent server crash
    console.error("🔥 Gemini SDK Error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "AI generation failed", 
      error: error.message 
    });
  }
};