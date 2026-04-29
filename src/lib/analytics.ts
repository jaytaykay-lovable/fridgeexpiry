import { supabase } from '@/integrations/supabase/client';

export const UNEP_KG_PER_CAPITA_PER_YEAR = 79;
export const UNEP_KG_PER_CAPITA_PER_WEEK = UNEP_KG_PER_CAPITA_PER_YEAR / 52;
export const UNEP_SOURCE_URL =
  'https://www.unep.org/resources/report/unep-food-waste-index-report-2021';

export type PeriodKey = 'week' | 'month' | '3m' | '6m' | 'year' | 'all';

export interface PeriodOption {
  key: PeriodKey;
  label: string;
  shortLabel: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: 'week', label: 'This week', shortLabel: '1W' },
  { key: 'month', label: 'This month', shortLabel: '1M' },
  { key: '3m', label: '3 months', shortLabel: '3M' },
  { key: '6m', label: '6 months', shortLabel: '6M' },
  { key: 'year', label: '1 year', shortLabel: '1Y' },
  { key: 'all', label: 'All time', shortLabel: 'ALL' },
];

export interface PeriodRange {
  start: Date;
  end: Date;
  bucket: 'day' | 'week' | 'month';
  weeks: number; // number of full weeks in the period (for benchmark math)
}

export function getPeriodRange(key: PeriodKey, accountStart: Date): PeriodRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  switch (key) {
    case 'week': {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: 'day', weeks: 1 };
    }
    case 'month': {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: 'week', weeks: 30 / 7 };
    }
    case '3m': {
      const start = new Date();
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: 'week', weeks: 90 / 7 };
    }
    case '6m': {
      const start = new Date();
      start.setMonth(start.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: 'month', weeks: 26 };
    }
    case 'year': {
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      return { start, end, bucket: 'month', weeks: 52 };
    }
    case 'all':
    default: {
      const start = new Date(accountStart);
      start.setHours(0, 0, 0, 0);
      const ms = end.getTime() - start.getTime();
      const weeks = Math.max(1, ms / (1000 * 60 * 60 * 24 * 7));
      const days = ms / (1000 * 60 * 60 * 24);
      const bucket: 'day' | 'week' | 'month' =
        days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';
      return { start, end, bucket, weeks };
    }
  }
}

export interface AnalyticsOverview {
  kg_avoided: number;
  kg_wasted: number;
  money_saved_sgd: number;
  items_consumed: number;
  items_wasted: number;
  meals_cooked: number;
  streak_days: number;
  total_kg_avoided_all_time: number;
  total_money_saved_all_time: number;
}

export interface SeriesPoint {
  bucket_start: string;
  kg_avoided: number;
  kg_wasted: number;
}

export async function fetchOverview(start: Date, end: Date): Promise<AnalyticsOverview> {
  const { data, error } = await supabase.rpc('analytics_overview', {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as any;
  return {
    kg_avoided: Number(row?.kg_avoided ?? 0),
    kg_wasted: Number(row?.kg_wasted ?? 0),
    money_saved_sgd: Number(row?.money_saved_sgd ?? 0),
    items_consumed: Number(row?.items_consumed ?? 0),
    items_wasted: Number(row?.items_wasted ?? 0),
    meals_cooked: Number(row?.meals_cooked ?? 0),
    streak_days: Number(row?.streak_days ?? 0),
    total_kg_avoided_all_time: Number(row?.total_kg_avoided_all_time ?? 0),
    total_money_saved_all_time: Number(row?.total_money_saved_all_time ?? 0),
  };
}

export async function fetchSeries(
  start: Date,
  end: Date,
  bucket: 'day' | 'week' | 'month',
): Promise<SeriesPoint[]> {
  const { data, error } = await supabase.rpc('analytics_series', {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
    p_bucket: bucket,
  });
  if (error) throw error;
  return ((data || []) as any[]).map((r) => ({
    bucket_start: r.bucket_start,
    kg_avoided: Number(r.kg_avoided ?? 0),
    kg_wasted: Number(r.kg_wasted ?? 0),
  }));
}

// ------------------------- Badges -------------------------

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  isUnlocked: (o: AnalyticsOverview, all: AnalyticsOverview) => boolean;
  progress?: (o: AnalyticsOverview, all: AnalyticsOverview) => string;
}

export const BADGES: BadgeDef[] = [
  {
    key: 'first_save',
    name: 'First Save',
    emoji: '🌱',
    description: 'Mark your first item as consumed',
    isUnlocked: (_o, all) => all.items_consumed >= 1,
    progress: (_o, all) => `${Math.min(all.items_consumed, 1)} / 1 saved`,
  },
  {
    key: 'waste_warrior',
    name: 'Waste Warrior',
    emoji: '⚔️',
    description: 'Avoid 5 kg of waste total',
    isUnlocked: (_o, all) => all.total_kg_avoided_all_time >= 5,
    progress: (_o, all) =>
      `${all.total_kg_avoided_all_time.toFixed(1)} / 5.0 kg`,
  },
  {
    key: 'zero_waste_week',
    name: 'Zero Waste Week',
    emoji: '✨',
    description: 'No items wasted in a full week',
    isUnlocked: (o) => o.kg_wasted === 0 && o.kg_avoided > 0,
  },
  {
    key: 'chef_in_house',
    name: 'Chef in the House',
    emoji: '👨‍🍳',
    description: 'Cook 10 meals via the recipe agent',
    isUnlocked: (_o, all) => all.meals_cooked >= 10,
    progress: (_o, all) => `${Math.min(all.meals_cooked, 10)} / 10 meals`,
  },
  {
    key: 'fifty_saved',
    name: '$50 Saved',
    emoji: '💵',
    description: 'Accumulate $50 in estimated savings',
    isUnlocked: (_o, all) => all.total_money_saved_all_time >= 50,
    progress: (_o, all) =>
      `$${all.total_money_saved_all_time.toFixed(2)} / $50.00`,
  },
  {
    key: 'hundred_saved',
    name: '$100 Saved',
    emoji: '💰',
    description: 'Accumulate $100 in estimated savings',
    isUnlocked: (_o, all) => all.total_money_saved_all_time >= 100,
    progress: (_o, all) =>
      `$${all.total_money_saved_all_time.toFixed(2)} / $100.00`,
  },
  {
    key: 'month_streak',
    name: 'Month Streak',
    emoji: '🔥',
    description: 'Use the app every day for 30 days',
    isUnlocked: (o) => o.streak_days >= 30,
    progress: (o) => `${Math.min(o.streak_days, 30)} / 30 days`,
  },
  {
    key: 'fridge_master',
    name: 'Fridge Master',
    emoji: '🏆',
    description: 'Avoid 50 kg of waste total',
    isUnlocked: (_o, all) => all.total_kg_avoided_all_time >= 50,
    progress: (_o, all) =>
      `${all.total_kg_avoided_all_time.toFixed(1)} / 50 kg`,
  },
  {
    key: 'century_saver',
    name: 'Century Saver',
    emoji: '💎',
    description: '$100 in savings within a single month',
    // Unlocked when current period (month) saves >= $100
    isUnlocked: (o) => o.money_saved_sgd >= 100,
    progress: (o) => `$${o.money_saved_sgd.toFixed(2)} / $100.00`,
  },
];

export async function fetchUnlockedBadges(): Promise<Set<string>> {
  const { data, error } = await supabase.from('badges').select('badge_key');
  if (error) {
    console.warn('badges fetch failed', error);
    return new Set();
  }
  return new Set((data || []).map((r: any) => r.badge_key));
}

export async function unlockBadge(key: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from('badges')
    .insert({ user_id: user.id, badge_key: key });
  if (error) {
    // unique violation = already unlocked
    if ((error as any).code === '23505') return false;
    console.warn('unlock badge failed', error);
    return false;
  }
  return true;
}
