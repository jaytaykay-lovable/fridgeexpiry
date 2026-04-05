import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

interface RecipeCardProps {
  recipe: RecipeCardType;
  onView: () => void;
}

export default function RecipeCard({ recipe, onView }: RecipeCardProps) {
  const [showMissing, setShowMissing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-card border shadow-sm"
    >
      {/* Hero Image */}
      <div className="relative aspect-video bg-muted">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-display text-lg font-bold">{recipe.title}</h3>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{recipe.readyMinutes} min</span>
          <span>·</span>
          <span>{recipe.servings} servings</span>
          <span>·</span>
          <span>♥ {recipe.likes}</span>
        </div>

        {/* Match Badge */}
        <div className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Uses {recipe.matchScore} selected items
        </div>

        {/* Missing Ingredients */}
        {recipe.missedIngredients.length > 0 && (
          <div>
            <button
              onClick={() => setShowMissing(!showMissing)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{recipe.missedIngredients.length} missing</span>
              {showMissing ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <AnimatePresence>
              {showMissing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {recipe.missedIngredients.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Reason */}
        <p className="text-sm text-muted-foreground italic">{recipe.reason}</p>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onView}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          View recipe
        </motion.button>
      </div>
    </motion.div>
  );
}
