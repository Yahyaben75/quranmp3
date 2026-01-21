
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async getSurahInfo(surahName: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `أعطني نبذة مختصرة جداً (3 أسطر كحد أقصى) عن فضل سورة ${surahName} ومقاصدها الأساسية.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || "لم يتم العثور على معلومات حالياً.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "تعذر جلب المعلومات، يرجى التحقق من اتصالك بالإنترنت.";
    }
  }
}

export const geminiService = new GeminiService();
