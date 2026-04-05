import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

interface ExploreMoreRowProps {
  recipes: RecipeCardType[];
  onSelect: (recipe: RecipeCardType) => void;
}

export default function ExploreMoreRow({ recipes, onSelect }: ExploreMoreRowProps) {
  const [expanded, setExpanded] = useState(false);

  if (recipes.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {expanded ? 'Show less' : 'Explore more recipes'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 mt-3 overflow-x-auto pb-2 -mx-4 px-4">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => onSelect(recipe)}
                  className="flex-shrink-0 w-32 space-y-1.5 text-left"
                >
                  <div className="aspect-video rounded-lg bg-muted overflow-hidden">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <p className="text-xs font-medium line-clamp-2">{recipe.title}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
