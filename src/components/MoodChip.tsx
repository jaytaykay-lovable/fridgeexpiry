import { motion } from 'framer-motion';

interface MoodChipProps {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
}

export default function MoodChip({ label, isSelected, onSelect }: MoodChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      role="button"
      className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-medium border transition-all ${
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      {label}
    </motion.button>
  );
}
