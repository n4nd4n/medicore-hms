import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("Gemini API Key is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDoctorBio = async (name: string, specialty: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "Experienced specialist dedicated to patient care.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a professional, short (2 sentences) biography for a doctor named ${name} who specializes in ${specialty}. Tone: Trustworthy and skilled.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Bio Gen Error:", error);
    return `Specialist in ${specialty} with a focus on patient well-being.`;
  }
};

export const askHealthAssistant = async (query: string): Promise<string> => {
  const ai = getAI();
  if (!ai) return "AI Service unavailable. Please check API Key.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful medical assistant in a hospital app. Answer this query briefly and professionally: "${query}". Always include a disclaimer that this is not professional medical advice.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm sorry, I cannot answer that right now.";
  }
};