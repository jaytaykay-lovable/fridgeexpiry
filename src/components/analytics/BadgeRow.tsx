import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Confetti from './Confetti';
import {
  type AnalyticsOverview,
  type BadgeDef,
  BADGES,
} from '@/lib/analytics';

interface Props {
  overview: AnalyticsOverview;
  allTime: AnalyticsOverview;
  unlocked: Set<string>;
  celebrating: BadgeDef | null;
  onDismissCelebration: () => void;
}

export default function BadgeRow({
  overview,
  allTime,
  unlocked,
  celebrating,
  onDismissCelebration,
}: Props) {
  const [selected, setSelected] = useState<BadgeDef | null>(null);

  return (
    <>
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold">Badges</h2>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
          {BADGES.map((b) => {
            const isUnlocked = unlocked.has(b.key);
            return (
              <button
                key={b.key}
                onClick={() => setSelected(b)}
                className={`flex w-24 flex-shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-secondary/30 to-accent/40 hover:scale-[1.03]'
                    : 'bg-muted/40 grayscale opacity-60'
                }`}
              >
                <div className="text-3xl">{b.emoji}</div>
                <p className="text-[11px] font-semibold leading-tight">
                  {b.name}
                </p>
                {!isUnlocked && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                    <Lock size={9} /> Locked
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-xs">
          {selected && (
            <div className="text-center">
              <div
                className={`mx-auto mb-3 text-6xl ${unlocked.has(selected.key) ? '' : 'grayscale opacity-50'}`}
              >
                {selected.emoji}
              </div>
              <h3 className="font-display text-lg font-bold">{selected.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {selected.description}
              </p>
              {!unlocked.has(selected.key) && selected.progress && (
                <p className="mt-3 text-xs font-medium text-primary">
                  {selected.progress(overview, allTime)}
                </p>
              )}
              {unlocked.has(selected.key) && (
                <p className="mt-3 text-xs font-medium text-success">
                  ✓ Unlocked
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-foreground/70 backdrop-blur-sm"
            onClick={onDismissCelebration}
          >
            <Confetti />
            <motion.div
              initial={{ scale: 0.6, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="relative w-72 rounded-3xl bg-card p-6 text-center shadow-2xl"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Badge unlocked!
              </p>
              <div className="my-4 text-7xl">{celebrating.emoji}</div>
              <h3 className="font-display text-xl font-bold">
                {celebrating.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {celebrating.description}
              </p>
              <button
                onClick={onDismissCelebration}
                className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Awesome
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
