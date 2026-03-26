import { GoogleGenerativeAI } from "@google/generative-ai";

// Standardize API key access for Vite environment
const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("GEMINI_API_KEY is not defined in the environment.");
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function generateText(prompt: string, systemInstruction?: string) {
  if (!genAI) return "AI Service not configured.";
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating text:", error);
    return "An error occurred while communicating with the AI.";
  }
}

export async function generateWithImage(prompt: string, base64Image: string, mimeType: string, systemInstruction?: string) {
  if (!genAI) return "AI Service not configured.";
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });

    // Convert base64 to parts format for official SDK
    const parts: any[] = [
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
      { text: prompt },
    ];

    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating with image:", error);
    return "An error occurred while analyzing the image.";
  }
}

// Keeping a simple placeholder for generateStructuredData
export async function generateStructuredData(prompt: string, schema: any, systemInstruction?: string) {
  // Basic implementation for now
  const text = await generateText(prompt, systemInstruction);
  return text;
}
