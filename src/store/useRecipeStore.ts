import { create } from 'zustand';
import type { MoodType, RecipeCard, RecipeDetail } from '@/types/recipe';
import { MOCK_RECIPES, MOCK_RECIPE_DETAIL, generateMockResults } from '@/test/recipe-utils';

interface RecipeState {
  selectedIngredients: string[];
  mood: MoodType;
  results: RecipeCard[];
  currentRecipe: RecipeDetail | null;
  isLoading: boolean;
  loadingNarration: string;

  setSelectedIngredients: (ingredients: string[]) => void;
  toggleIngredient: (ingredient: string) => void;
  setMood: (mood: MoodType) => void;
  searchRecipes: () => Promise<void>;
  surpriseMe: () => Promise<void>;
  selectRecipe: (recipe: RecipeCard) => Promise<void>;
  clearResults: () => void;
}

const loadingNarrations = [
  'Looking at your ingredients...',
  'Checking recipe options...',
  'Found some great matches!',
];

export const useRecipeStore = create<RecipeState>((set, get) => ({
  selectedIngredients: [],
  mood: null,
  results: [],
  currentRecipe: null,
  isLoading: false,
  loadingNarration: '',

  setSelectedIngredients: (ingredients) => set({ selectedIngredients: ingredients }),

  toggleIngredient: (ingredient) => {
    const current = get().selectedIngredients;
    const updated = current.includes(ingredient)
      ? current.filter((i) => i !== ingredient)
      : [...current, ingredient];
    set({ selectedIngredients: updated });
  },

  setMood: (mood) => set({ mood }),

  searchRecipes: async () => {
    set({ isLoading: true, loadingNarration: loadingNarrations[0] });

    // Simulate loading narrations
    await new Promise((r) => setTimeout(r, 600));
    set({ loadingNarration: loadingNarrations[1] });
    await new Promise((r) => setTimeout(r, 600));
    set({ loadingNarration: loadingNarrations[2] });
    await new Promise((r) => setTimeout(r, 400));

    const results = generateMockResults(get().selectedIngredients);
    set({ results, isLoading: false, loadingNarration: '' });
  },

  surpriseMe: async () => {
    set({ isLoading: true, loadingNarration: 'Let me pick something for you...' });
    await new Promise((r) => setTimeout(r, 1000));
    set({ results: MOCK_RECIPES, isLoading: false, loadingNarration: '' });
  },

  selectRecipe: async (_recipe: RecipeCard) => {
    // In mock mode, always return the same detail
    set({ currentRecipe: MOCK_RECIPE_DETAIL });
  },

  clearResults: () => set({ results: [], currentRecipe: null, selectedIngredients: [], mood: null }),
}));
