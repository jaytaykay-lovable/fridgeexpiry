import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFridgeStore } from '@/store/useFridgeStore';
import {
  BADGES,
  type AnalyticsOverview,
  type BadgeDef,
  type PeriodKey,
  type SeriesPoint,
  fetchOverview,
  fetchSeries,
  fetchUnlockedBadges,
  getPeriodRange,
  unlockBadge,
} from '@/lib/analytics';
import PeriodPicker from '@/components/analytics/PeriodPicker';
import HeroStats from '@/components/analytics/HeroStats';
import WasteChart from '@/components/analytics/WasteChart';
import ExpiryNudge from '@/components/analytics/ExpiryNudge';
import BadgeRow from '@/components/analytics/BadgeRow';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { items, settings, fetchItems, fetchSettings } = useFridgeStore();

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [allTime, setAllTime] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState<BadgeDef | null>(null);
  const celebrationQueue = useRef<BadgeDef[]>([]);

  const accountStart = useMemo(
    () => new Date(user?.created_at || Date.now() - 30 * 86400000),
    [user?.created_at],
  );

  const range = useMemo(
    () => getPeriodRange(period, accountStart),
    [period, accountStart],
  );

  // Initial fridge + settings fetch
  useEffect(() => {
    if (items.length === 0) fetchItems();
    if (!settings) fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load analytics whenever the period changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const allTimeStart = new Date(accountStart);
        allTimeStart.setHours(0, 0, 0, 0);
        const allTimeEnd = new Date();
        allTimeEnd.setHours(23, 59, 59, 999);

        const [ov, allOv, sr, badges] = await Promise.all([
          fetchOverview(range.start, range.end),
          fetchOverview(allTimeStart, allTimeEnd),
          fetchSeries(range.start, range.end, range.bucket),
          fetchUnlockedBadges(),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setAllTime(allOv);
        setSeries(sr);
        setUnlocked(badges);

        // Detect new badge unlocks against all-time + current period numbers
        const newlyUnlocked = BADGES.filter(
          (b) => !badges.has(b.key) && b.isUnlocked(ov, allOv),
        );
        if (newlyUnlocked.length > 0) {
          for (const b of newlyUnlocked) {
            // Persist sequentially; don't await all to avoid stutter
            unlockBadge(b.key).then((ok) => {
              if (ok) {
                setUnlocked((prev) => new Set(prev).add(b.key));
                celebrationQueue.current.push(b);
                if (!celebrating) {
                  const next = celebrationQueue.current.shift();
                  if (next) setCelebrating(next);
                }
              }
            });
          }
        }
      } catch (e) {
        if (cancelled) return;
        console.error('analytics load failed', e);
        setError(e instanceof Error ? e.message : 'Could not load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [range.start.getTime(), range.end.getTime(), range.bucket]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissCelebration = () => {
    setCelebrating(null);
    setTimeout(() => {
      const next = celebrationQueue.current.shift();
      if (next) setCelebrating(next);
    }, 300);
  };

  const householdSize = settings?.household_size ?? 1;

  return (
    <div className="page-container pb-28">
      <header className="mb-2">
        <h1 className="font-display text-2xl font-bold">Your impact</h1>
        <p className="text-sm text-muted-foreground">
          See how much waste you're avoiding 🌱
        </p>
      </header>

      <PeriodPicker value={period} onChange={setPeriod} />

      <AnimatePresence mode="wait">
        {loading && !overview ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="mt-2 text-sm">Crunching numbers…</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
          >
            <AlertCircle className="mx-auto mb-2 text-destructive" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setPeriod((p) => p)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <RefreshCw size={12} /> Try again
            </button>
          </motion.div>
        ) : overview && allTime ? (
          <motion.div
            key={period}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <HeroStats
              overview={overview}
              weeks={range.weeks}
              householdSize={householdSize}
            />
            <WasteChart data={series} bucket={range.bucket} />
            <ExpiryNudge items={items} />
            <BadgeRow
              overview={overview}
              allTime={allTime}
              unlocked={unlocked}
              celebrating={celebrating}
              onDismissCelebration={dismissCelebration}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
