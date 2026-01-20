
import { GoogleGenAI } from "@google/genai";

export const getAICommentary = async (
  guess: number, 
  target: number, 
  attempts: number,
  playerName: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const isHigher = guess > target;
    const diff = Math.abs(guess - target);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a witty game show host. ${playerName} just guessed ${guess}. 
      The actual target is ${target}. 
      They are ${isHigher ? 'Higher' : 'Lower'} by ${diff}. 
      This is attempt #${attempts}. 
      Give a very short (max 15 words) sarcastic or encouraging hint.`,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text || (isHigher ? "Too high!" : "Too low!");
  } catch (e) {
    return guess > target ? "Too high, try smaller!" : "Too low, think bigger!";
  }
};
