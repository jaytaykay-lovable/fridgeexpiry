import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useFridgeStore } from '@/store/useFridgeStore';
import type { MoodType, RecipeCard, RecipeDetail } from '@/types/recipe';

interface RecipeState {
  selectedIngredients: string[];
  mood: MoodType;
  results: RecipeCard[];
  exploreResults: RecipeCard[];
  currentRecipe: RecipeDetail | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  loadingNarration: string;
  error: string | null;

  setSelectedIngredients: (ingredients: string[]) => void;
  toggleIngredient: (ingredient: string) => void;
  setMood: (mood: MoodType) => void;
  searchRecipes: () => Promise<void>;
  surpriseMe: () => Promise<void>;
  selectRecipe: (recipe: RecipeCard | { id: number }) => Promise<void>;
  clearResults: () => void;
  clearCurrentRecipe: () => void;
}

const loadingNarrations = [
  'Looking at your ingredients...',
  'Searching thousands of recipes...',
  'Picking the best matches for you...',
];

const daysUntil = (date: string) =>
  Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

async function callDiscoverRecipes(
  ingredientsWithExpiry: { name: string; expiryDays?: number }[],
  mood: MoodType,
) {
  const { data, error } = await supabase.functions.invoke('discover-recipes', {
    body: { ingredients: ingredientsWithExpiry, mood },
  });
  if (error) {
    // Try to parse the response body for a friendly message
    let msg = error.message || 'Could not load recipes';
    try {
      const ctx = (error as any).context;
      if (ctx?.json) {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data as { top: RecipeCard[]; explore: RecipeCard[] };
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  selectedIngredients: [],
  mood: null,
  results: [],
  exploreResults: [],
  currentRecipe: null,
  isLoading: false,
  isLoadingDetail: false,
  loadingNarration: '',
  error: null,

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
    const { selectedIngredients, mood } = get();
    if (selectedIngredients.length === 0) return;

    set({ isLoading: true, loadingNarration: loadingNarrations[0], error: null, results: [], exploreResults: [] });

    // Cycle narrations during the request
    const narrationTimer = setInterval(() => {
      const current = get().loadingNarration;
      const idx = loadingNarrations.indexOf(current);
      const next = loadingNarrations[(idx + 1) % loadingNarrations.length];
      set({ loadingNarration: next });
    }, 1200);

    try {
      const fridgeItems = useFridgeStore.getState().items.filter((i) => i.status === 'active');
      const expiryMap = new Map<string, number>();
      for (const item of fridgeItems) {
        expiryMap.set(item.name.toLowerCase(), daysUntil(item.expiry_date));
      }
      const payload = selectedIngredients.map((name) => ({
        name,
        expiryDays: expiryMap.get(name.toLowerCase()),
      }));

      const { top, explore } = await callDiscoverRecipes(payload, mood);
      set({ results: top || [], exploreResults: explore || [], isLoading: false, loadingNarration: '' });
    } catch (e) {
      console.error('searchRecipes failed', e);
      set({
        isLoading: false,
        loadingNarration: '',
        error: e instanceof Error ? e.message : 'Could not load recipes',
      });
    } finally {
      clearInterval(narrationTimer);
    }
  },

  surpriseMe: async () => {
    const fridgeItems = useFridgeStore.getState().items.filter((i) => i.status === 'active');
    if (fridgeItems.length === 0) {
      set({ error: 'Add some items to your fridge first!' });
      return;
    }
    set({
      selectedIngredients: fridgeItems.map((i) => i.name),
      mood: null,
    });
    await get().searchRecipes();
  },

  selectRecipe: async (recipe) => {
    const id = (recipe as any).id;
    if (!id) return;

    // Use already-loaded recipe data if available
    const fromTop = get().results.find((r) => r.id === id);
    const fromExplore = get().exploreResults.find((r) => r.id === id);
    const known = fromTop || fromExplore;

    set({ isLoadingDetail: true, error: null });

    try {
      const fridgeItems = useFridgeStore.getState().items.filter((i) => i.status === 'active');
      const fridge = fridgeItems.map((i) => i.name).join(',');

      // Use direct fetch — invoke() doesn't support GET query params cleanly
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipe-detail?id=${id}&fridge=${encodeURIComponent(fridge)}`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load recipe (${res.status})`);
      }
      const detail: RecipeDetail = await res.json();

      // Merge with known card data so we keep image/likes/reason if missing
      const merged: RecipeDetail = {
        ...(known as any),
        ...(detail as any),
        reason: known?.reason || detail.reason || '',
      };
      set({ currentRecipe: merged, isLoadingDetail: false });

      // Log "viewed"
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        supabase
          .from('recipe_history')
          .insert({
            user_id: userData.user.id,
            spoonacular_id: merged.id,
            title: merged.title,
            image_url: merged.image,
            action: 'viewed',
            ingredients_used: [],
          })
          .then(({ error: histErr }) => {
            if (histErr) console.warn('history log failed', histErr);
          });
      }
    } catch (e) {
      console.error('selectRecipe failed', e);
      set({
        isLoadingDetail: false,
        error: e instanceof Error ? e.message : 'Could not load recipe',
      });
    }
  },

  clearResults: () =>
    set({
      results: [],
      exploreResults: [],
      currentRecipe: null,
      selectedIngredients: [],
      mood: null,
      error: null,
    }),

  clearCurrentRecipe: () => set({ currentRecipe: null }),
}));
