import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface MatchedIngredient {
  name: string;
  inFridge: boolean;
}

interface CookConfirmationDialogProps {
  isOpen: boolean;
  matchedIngredients: MatchedIngredient[];
  onConfirm: (removedIngredients: string[]) => void;
  onCancel: () => void;
}

export default function CookConfirmationDialog({
  isOpen,
  matchedIngredients,
  onConfirm,
  onCancel,
}: CookConfirmationDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(matchedIngredients.map((i) => i.name))
  );

  const toggleIngredient = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>What did you use?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {matchedIngredients.map((ingredient) => (
            <label
              key={ingredient.name}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(ingredient.name)}
                onChange={() => toggleIngredient(ingredient.name)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{ingredient.name}</span>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Update fridge
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
