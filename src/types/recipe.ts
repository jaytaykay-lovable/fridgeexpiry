export interface RecipeCard {
  id: number;
  title: string;
  image: string;
  readyMinutes: number;
  servings: number;
  likes: number;
  usedIngredients: string[];
  missedIngredients: string[];
  matchScore: number; // e.g., 5 out of 6 selected
  reason: string;
  sourceUrl: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  unit: string;
  inFridge: boolean;
}

export interface RecipeDetail extends RecipeCard {
  ingredients: RecipeIngredient[];
  instructions: { step: number; text: string }[];
}

export type MoodType = 'quick' | 'comfort' | 'healthy' | 'fancy' | null;

export interface RecipeSearchState {
  selectedIngredients: string[];
  mood: MoodType;
  results: RecipeCard[];
  currentRecipe: RecipeDetail | null;
  isLoading: boolean;
  loadingNarration: string;
}
