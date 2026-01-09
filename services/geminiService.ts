import { GoogleGenAI } from "@google/genai";
import { CoachMessage } from "../types";

// Initialize Gemini Client
// Note: API key should be stored in .env file (not committed to git)
// See .env.example for required environment variables
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const getGeminiCoaching = async (score: number, context: 'start' | 'mid' | 'end'): Promise<CoachMessage> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    return { text: "Keep pushing! (API Key missing)", type: 'motivation' };
  }

  const prompts = {
    start: "Generate a short, high-energy 1-sentence motivational quote for someone about to start a squat workout challenge.",
    mid: `The user has done ${score} squats so far. Give a very short, encouraging 1-sentence remark to keep them going.`,
    end: `The user just finished ${score} squats. Give a 1-sentence congratulatory remark emphasizing leg strength.`,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompts[context],
    });

    const text = response.text || "Let's go!";
    return {
      text: text.trim(),
      type: context === 'end' ? 'congrats' : 'motivation',
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "Focus on your form!", type: 'tip' };
  }
};
