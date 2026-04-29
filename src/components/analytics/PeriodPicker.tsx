import { motion } from 'framer-motion';
import { PERIOD_OPTIONS, type PeriodKey } from '@/lib/analytics';

interface Props {
  value: PeriodKey;
  onChange: (k: PeriodKey) => void;
}

export default function PeriodPicker({ value, onChange }: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 pb-3 pt-2 bg-background/85 backdrop-blur-md">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {PERIOD_OPTIONS.map((opt) => {
          const active = opt.key === value;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={`relative flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
