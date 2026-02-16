import { GoogleGenAI, Type } from "@google/genai";
import { MealType } from "../types";

// הגנה: גישה בטוחה למשתנה הסביבה
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

// פונקציית עזר לייצור URL של תמונה מהירה
const getFastImageUrl = (prompt: string) => {
  const seed = Math.floor(Math.random() * 10000);
  // הקטנת הרזולוציה ל-512x512 הופכת את הטעינה להרבה יותר מהירה
  const basePrompt = encodeURIComponent(`Professional food photography, ${prompt}, high quality, appetizing`);
  return `https://image.pollinations.ai/prompt/${basePrompt}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;
};

export const generateDailyMealPlan = async (userGoals: string = "חיטוב", weight: number = 90) => {
  if (!apiKey) {
    console.error("Gemini API Key is missing!");
    return [];
  }

  const prompt = `צור רשימה של 20 אפשרויות למנות "פיטנס נגיש" עבור משתמש השוקל ${weight} קילו ונמצא בשלב ${userGoals}. 
  הדגש הוא על מנות פשוטות מאוד להכנה, עשירות בחלבון ודלות קלוריות בהתאם למשקל של ${weight} ק"ג.
  עבור כל מנה, צור גם שדה בשם 'imagePrompt' באנגלית קצר וקולע (מקסימום 5 מילים) שמתאר את המנה.
  החזר: 5 אפשרויות לבוקר, 5 לצהריים, 5 לערב ו-5 נשנושים.
  החזר את התשובה בפורמט JSON בלבד.`;

  try {
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

    const data = JSON.parse(response.text || "[]");
    return data.map((meal: any) => ({
      ...meal,
      imageUrl: getFastImageUrl(meal.imagePrompt)
    }));
  } catch (error) {
    console.error("Failed to fetch or parse AI response", error);
    return [];
  }
};

export const fetchReplacementMeal = async (mealType: MealType, userGoals: string = "חיטוב", weight: number = 90) => {
  if (!apiKey) return null;

  const prompt = `הצע מנה אחת פשוטה מאוד להכנה מסוג ${mealType} עבור אדם ב${userGoals} ששוקל ${weight} קילו. 
  צור גם שדה 'imagePrompt' באנגלית קצר לתיאור ויזואלי.
  החזר JSON אובייקט בודד בלבד.`;

  try {
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

    const meal = JSON.parse(response.text || "{}");
    return {
      ...meal,
      imageUrl: getFastImageUrl(meal.imagePrompt)
    };
  } catch (error) {
    console.error("Failed to parse replacement meal", error);
    return null;
  }
};

export const analyzeProductForCutting = async (imageData: string) => {
  if (!apiKey) return { score: 0, analysis: "API Key missing", productName: "Error" };

  const prompt = `נתח את המוצר שבתמונה. קבע עד כמה הוא טוב לחיטוב.
  החזר JSON בפורמט: { "score": number, "analysis": "string", "productName": "string" }`;

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageData,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Analysis failed", error);
    throw error;
  }
};