import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { FoodItem, UserSettings } from '@/types/food';

interface FridgeState {
  items: FoodItem[];
  settings: UserSettings | null;
  loading: boolean;
  processingImage: boolean;

  fetchItems: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Pick<UserSettings, 'default_expiry_days' | 'notify_days_before'>>) => Promise<void>;
  markConsumed: (id: string) => Promise<void>;
  markWasted: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<Pick<FoodItem, 'name' | 'category' | 'expiry_date'>>) => Promise<void>;
  addItems: (items: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
  setProcessingImage: (v: boolean) => void;
}

export const useFridgeStore = create<FridgeState>((set, get) => ({
  items: [],
  settings: null,
  loading: false,
  processingImage: false,

  setProcessingImage: (v) => set({ processingImage: v }),

  fetchItems: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('status', 'active')
      .order('expiry_date', { ascending: true });

    if (!error && data) {
      set({ items: data as unknown as FoodItem[] });
    }
    set({ loading: false });
  },

  fetchSettings: async () => {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .single();

    if (!error && data) {
      set({ settings: data as unknown as UserSettings });
    }
  },

  updateSettings: async (updates) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (!error) {
      set((s) => ({
        settings: s.settings ? { ...s.settings, ...updates } : s.settings,
      }));
    }
  },

  markConsumed: async (id) => {
    // Optimistic update
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) });

    const { error } = await supabase
      .from('food_items')
      .update({ status: 'consumed' as never, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ items: prev });
    }
  },

  markWasted: async (id) => {
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) });

    const { error } = await supabase
      .from('food_items')
      .update({ status: 'wasted' as never, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ items: prev });
    }
  },

  updateItem: async (id, updates) => {
    const prev = get().items;
    set({
      items: prev.map((i) => (i.id === id ? { ...i, ...updates, is_flagged: false } : i)),
    });

    const { error } = await supabase
      .from('food_items')
      .update({ ...updates, is_flagged: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ items: prev });
    }
  },

  addItems: async (items) => {
    const { data, error } = await supabase
      .from('food_items')
      .insert(items as never[])
      .select();

    if (!error && data) {
      set((s) => ({
        items: [...s.items, ...(data as unknown as FoodItem[])].sort(
          (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        ),
      }));
    }
  },
}));
