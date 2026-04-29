import { motion } from 'framer-motion';
import { Coins, Flame, ChefHat } from 'lucide-react';
import {
  UNEP_KG_PER_CAPITA_PER_WEEK,
  UNEP_SOURCE_URL,
  type AnalyticsOverview,
} from '@/lib/analytics';

interface Props {
  overview: AnalyticsOverview;
  weeks: number;
  householdSize: number;
}

const formatKg = (n: number) => n.toFixed(1);

export default function HeroStats({ overview, weeks, householdSize }: Props) {
  const expectedWaste =
    UNEP_KG_PER_CAPITA_PER_WEEK * Math.max(1, householdSize) * Math.max(1, weeks);
  const ratio =
    expectedWaste > 0 ? Math.min(1, overview.kg_avoided / expectedWaste) : 0;

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary via-primary to-emerald-500 p-6 text-primary-foreground shadow-lg"
      >
        {/* Decorative orb */}
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-8 -left-10 h-32 w-32 rounded-full bg-secondary/30 blur-2xl" />

        <p className="text-xs font-medium uppercase tracking-wider opacity-80">
          Food waste avoided
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <motion.span
            key={overview.kg_avoided}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-bold leading-none"
          >
            {formatKg(overview.kg_avoided)}
          </motion.span>
          <span className="text-xl font-semibold opacity-90">kg</span>
        </div>

        {/* Benchmark */}
        <div className="mt-5 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratio * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-white/90"
            />
          </div>
          <p className="text-xs leading-relaxed opacity-90">
            A typical household of {householdSize} would waste{' '}
            <span className="font-semibold">{formatKg(expectedWaste)} kg</span>{' '}
            in this period.{' '}
            <a
              href={UNEP_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80"
            >
              UNEP 2021
            </a>
          </p>
        </div>
      </motion.div>

      {/* Secondary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          icon={<Coins size={16} />}
          label="Saved"
          value={`$${overview.money_saved_sgd.toFixed(2)}`}
          tooltip="Calculated from items consumed × estimated item cost. Estimates based on average Singapore retail prices."
        />
        <StatTile
          icon={<ChefHat size={16} />}
          label="Meals cooked"
          value={String(overview.meals_cooked)}
        />
        <StatTile
          icon={<Flame size={16} />}
          label="Day streak"
          value={String(overview.streak_days)}
        />
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      title={tooltip}
      className="rounded-2xl border bg-card p-3 shadow-sm"
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1.5 font-display text-lg font-bold tabular-nums">
        {value}
      </p>
    </motion.div>
  );
}
