export interface FoodItem {
  id: string;
  user_id: string;
  name: string;
  category: string;
  expiry_date: string;
  is_flagged: boolean;
  image_url: string | null;
  status: 'active' | 'consumed' | 'wasted';
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  default_expiry_days: number;
  notify_days_before: number;
  created_at: string;
  updated_at: string;
}

export const FOOD_CATEGORIES = [
  'Dairy',
  'Meat',
  'Seafood',
  'Fruits',
  'Vegetables',
  'Grains',
  'Beverages',
  'Snacks',
  'Condiments',
  'Frozen',
  'Bakery',
  'Other',
] as const;
