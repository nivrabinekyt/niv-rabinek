
import { GoogleGenAI, Type } from "@google/genai";
import { MealType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailyMealPlan = async (userGoals: string = "חיטוב", weight: number = 90) => {
  const prompt = `צור רשימה של 20 אפשרויות למנות "פיטנס נגיש" עבור משתמש השוקל ${weight} קילו ונמצא בשלב ${userGoals}. 
  הדגש הוא על מנות פשוטות מאוד להכנה, עשירות בחלבון ודלות קלוריות בהתאם למשקל של ${weight} ק"ג.
  עבור כל מנה, צור גם שדה בשם 'imagePrompt' באנגלית שמתאר את המנה בצורה הכי מפתה וריאליסטית לצילום אוכל מקצועי.
  החזר: 5 אפשרויות לבוקר, 5 לצהריים, 5 לערב ו-5 נשנושים.
  החזר את התשובה בפורמט JSON בלבד.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(MealType) },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING }
          },
          required: ["id", "name", "type", "calories", "protein", "carbs", "fat", "description", "imagePrompt"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data.map((meal: any) => ({
      ...meal,
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent("Professional food photography of " + meal.imagePrompt + ", ultra-realistic, highly detailed, cinematic lighting, gourmet plating, 8k, mouth-watering") || 'healthy-meal'}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 10000)}`
    }));
  } catch (error) {
    console.error("Failed to parse AI response", error);
    return [];
  }
};

export const fetchReplacementMeal = async (mealType: MealType, userGoals: string = "חיטוב", weight: number = 90) => {
  const prompt = `הצע מנה אחת פשוטה מאוד להכנה מסוג ${mealType} עבור אדם ב${userGoals} ששוקל ${weight} קילו. 
  צור גם שדה 'imagePrompt' באנגלית לתיאור ויזואלי מגרה.
  החזר JSON אובייקט בודד בלבד.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: [mealType] },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          description: { type: Type.STRING },
          imagePrompt: { type: Type.STRING }
        },
        required: ["id", "name", "type", "calories", "protein", "carbs", "fat", "description", "imagePrompt"]
      }
    }
  });

  try {
    const meal = JSON.parse(response.text || "{}");
    return {
      ...meal,
      imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent("Professional food photography of " + meal.imagePrompt + ", ultra-realistic, highly detailed, cinematic lighting, gourmet plating, 8k, mouth-watering") || 'healthy-meal'}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 10000)}`
    };
  } catch (error) {
    console.error("Failed to parse replacement meal", error);
    return null;
  }
};

export const analyzeProductForCutting = async (imageData: string) => {
  const prompt = `נתח את המוצר שבתמונה. קבע עד כמה הוא טוב לחיטוב.
  החזר JSON בפורמט: { "score": number, "analysis": "string", "productName": "string" }`;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageData,
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [imagePart, { text: prompt }] },
    config: { responseMimeType: "application/json" }
  });

  return JSON.parse(response.text || "{}");
};
