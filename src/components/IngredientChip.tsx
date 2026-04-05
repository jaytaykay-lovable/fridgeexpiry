import { motion } from 'framer-motion';

interface IngredientChipProps {
  name: string;
  isSelected: boolean;
  onToggle: () => void;
  expiryDays?: number;
}

export default function IngredientChip({ name, isSelected, onToggle, expiryDays }: IngredientChipProps) {
  const isExpiring = expiryDays !== undefined && expiryDays <= 3;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      role="button"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
        isSelected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:border-primary/40'
      }`}
    >
      <span>{name}</span>
      {isExpiring && expiryDays !== undefined && (
        <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/70' : 'text-warning'}`}>
          {expiryDays}d left
        </span>
      )}
    </motion.button>
  );
}
