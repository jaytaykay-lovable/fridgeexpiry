import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { FoodItem, UserSettings } from '@/types/food';

interface FridgeState {
  items: FoodItem[];
  settings: UserSettings | null;
  loading: boolean;

  fetchItems: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Pick<UserSettings, 'default_expiry_days' | 'notify_days_before'>>) => Promise<void>;
  markConsumed: (id: string) => Promise<boolean>;
  markWasted: (id: string) => Promise<boolean>;
  restoreItem: (id: string) => Promise<boolean>;
  updateItem: (id: string, updates: Partial<Pick<FoodItem, 'name' | 'category' | 'expiry_date'>>) => Promise<void>;
}

export const useFridgeStore = create<FridgeState>((set, get) => ({
  items: [],
  settings: null,
  loading: false,

  fetchItems: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
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
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) });

    const { error } = await supabase
      .from('food_items')
      .update({ status: 'consumed' as never, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ items: prev });
      return false;
    }

    return true;
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
      return false;
    }

    return true;
  },

  restoreItem: async (id) => {
    const prev = get().items;
    set({
      items: prev.map((i) =>
        i.id === id
          ? { ...i, status: 'active', updated_at: new Date().toISOString() }
          : i,
      ),
    });

    const { error } = await supabase
      .from('food_items')
      .update({ status: 'active' as never, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ items: prev });
      return false;
    }

    return true;
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
}));
