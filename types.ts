
export enum MealType {
  BREAKFAST = 'ארוחת בוקר',
  LUNCH = 'ארוחת צהריים',
  DINNER = 'ארוחת ערב',
  SNACK = 'נשנוש',
}

export interface MacroData {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl: string;
  description: string;
}

export interface DailyProgress {
  consumed: MacroData;
  target: MacroData;
}
