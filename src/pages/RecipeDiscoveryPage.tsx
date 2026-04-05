import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useFridgeStore } from '@/store/useFridgeStore';
import IngredientChip from '@/components/IngredientChip';
import MoodChip from '@/components/MoodChip';
import RecipeCard from '@/components/RecipeCard';
import ExploreMoreRow from '@/components/ExploreMoreRow';
import type { MoodType } from '@/types/recipe';
import { Loader2 } from 'lucide-react';

const MOODS: { label: string; value: MoodType }[] = [
  { label: 'Quick', value: 'quick' },
  { label: 'Comfort', value: 'comfort' },
  { label: 'Healthy', value: 'healthy' },
  { label: 'Fancy', value: 'fancy' },
];

export function RecipeDiscoveryPage() {
  const navigate = useNavigate();
  const { items } = useFridgeStore();
  const {
    selectedIngredients,
    mood,
    results,
    isLoading,
    loadingNarration,
    setSelectedIngredients,
    toggleIngredient,
    setMood,
    searchRecipes,
    surpriseMe,
    clearResults,
  } = useRecipeStore();

  // Pre-select expiring items on mount
  useEffect(() => {
    const activeItems = items.filter((i) => i.status === 'active');
    const expiringItems = activeItems.filter((item) => {
      const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 3;
    });

    if (selectedIngredients.length === 0 && expiringItems.length > 0) {
      setSelectedIngredients(expiringItems.map((i) => i.name));
    }
  }, [items, selectedIngredients, setSelectedIngredients]);

  const activeItems = items.filter((i) => i.status === 'active');
  const expiringCount = activeItems.filter((item) => {
    const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).length;

  const handleViewRecipe = (recipeId: number) => {
    navigate(`/recipes/${recipeId}`);
  };

  const handleSurpriseMe = async () => {
    // Use all active items
    const allNames = activeItems.map((i) => i.name);
    setSelectedIngredients(allNames);
    await surpriseMe();
  };

  const handleSelectFromExplore = (recipe: any) => {
    navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className="page-container">
      <AnimatePresence mode="wait">
        {!isLoading && results.length === 0 ? (
          /* Selection State */
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div>
              <h1 className="font-display text-2xl font-bold">What are we cooking?</h1>
              {expiringCount > 0 && (
                <p className="text-sm text-warning mt-1 font-medium">
                  {expiringCount} item{expiringCount !== 1 ? 's' : ''} expiring soon
                </p>
              )}
            </div>

            {/* Ingredient Chips */}
            <div>
              <h2 className="text-sm font-semibold mb-2">Ingredients</h2>
              <div className="flex flex-wrap gap-2">
                {activeItems.map((item) => {
                  const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <IngredientChip
                      key={item.id}
                      name={item.name}
                      isSelected={selectedIngredients.includes(item.name)}
                      onToggle={() => toggleIngredient(item.name)}
                      expiryDays={days}
                    />
                  );
                })}
              </div>
            </div>

            {/* Mood Chips */}
            <div>
              <h2 className="text-sm font-semibold mb-2">Mood</h2>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <MoodChip
                    key={m.value!}
                    label={m.label}
                    isSelected={mood === m.value}
                    onSelect={() => setMood(mood === m.value ? null : m.value)}
                  />
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={searchRecipes}
                disabled={selectedIngredients.length === 0}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find recipes
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSurpriseMe}
                className="w-full rounded-xl border border-border bg-card text-foreground py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Surprise me
              </motion.button>
            </div>
          </motion.div>
        ) : isLoading ? (
          /* Loading State */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{loadingNarration}</p>
          </motion.div>
        ) : (
          /* Results State */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div>
              <h1 className="font-display text-xl font-bold">3 recipes for you</h1>
              <p className="text-sm text-muted-foreground">Using {selectedIngredients.length} ingredients</p>
            </div>

            {results.slice(0, 3).map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <RecipeCard
                  recipe={recipe}
                  onView={() => handleViewRecipe(recipe.id)}
                />
              </motion.div>
            ))}

            <ExploreMoreRow
              recipes={results.slice(3)}
              onSelect={handleSelectFromExplore}
            />

            <button
              onClick={() => {
                clearResults();
                setSelectedIngredients(expiringCount > 0
                  ? activeItems
                      .filter((item) => {
                        const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return days <= 3;
                      })
                      .map((i) => i.name)
                  : []
                );
              }}
              className="w-full mt-4 rounded-xl border border-border bg-card text-foreground py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              Start over
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
