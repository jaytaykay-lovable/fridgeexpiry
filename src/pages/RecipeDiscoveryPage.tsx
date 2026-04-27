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
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

const MOODS: { label: string; value: MoodType }[] = [
  { label: 'Quick', value: 'quick' },
  { label: 'Comfort', value: 'comfort' },
  { label: 'Healthy', value: 'healthy' },
  { label: 'Fancy', value: 'fancy' },
];

export function RecipeDiscoveryPage() {
  const navigate = useNavigate();
  const { items, fetchItems } = useFridgeStore();
  const {
    selectedIngredients,
    mood,
    results,
    exploreResults,
    isLoading,
    loadingNarration,
    error,
    setSelectedIngredients,
    toggleIngredient,
    setMood,
    searchRecipes,
    surpriseMe,
    clearResults,
  } = useRecipeStore();

  // Load fridge items if not loaded
  useEffect(() => {
    if (items.length === 0) {
      fetchItems();
    }
  }, [items.length, fetchItems]);

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
  }, [items, selectedIngredients.length, setSelectedIngredients]);

  const activeItems = items.filter((i) => i.status === 'active');
  const expiringCount = activeItems.filter((item) => {
    const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).length;

  const handleViewRecipe = (recipeId: number) => {
    navigate(`/recipes/${recipeId}`);
  };

  const handleSurpriseMe = async () => {
    await surpriseMe();
  };

  const handleSelectFromExplore = (recipe: any) => {
    navigate(`/recipes/${recipe.id}`);
  };

  return (
    <div className="page-container pb-24">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-4"
          >
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-primary animate-pulse" />
            </div>
            <motion.p
              key={loadingNarration}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted-foreground text-center max-w-xs"
            >
              {loadingNarration}
            </motion.p>
            {selectedIngredients.length > 0 && (
              <p className="text-xs text-muted-foreground/70">
                Using {selectedIngredients.slice(0, 3).join(', ')}
                {selectedIngredients.length > 3 && ` +${selectedIngredients.length - 3} more`}
              </p>
            )}
          </motion.div>
        ) : results.length > 0 ? (
          /* Results State */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div>
              <h1 className="font-display text-xl font-bold">{results.length} recipes for you</h1>
              <p className="text-sm text-muted-foreground">Using {selectedIngredients.length} ingredients</p>
            </div>

            {results.map((recipe, index) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <RecipeCard
                  recipe={recipe}
                  onView={() => handleViewRecipe(recipe.id)}
                />
              </motion.div>
            ))}

            {exploreResults.length > 0 && (
              <ExploreMoreRow
                recipes={exploreResults}
                onSelect={handleSelectFromExplore}
              />
            )}

            <button
              onClick={() => clearResults()}
              className="w-full mt-4 rounded-xl border border-border bg-card text-foreground py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              Start over
            </button>
          </motion.div>
        ) : (
          /* Selection State */
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="font-display text-2xl font-bold">What are we cooking?</h1>
              {expiringCount > 0 ? (
                <p className="text-sm text-warning mt-1 font-medium">
                  {expiringCount} item{expiringCount !== 1 ? 's' : ''} expiring soon
                </p>
              ) : activeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Add some food to your fridge to discover recipes.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Pick what you'd like to cook with.
                </p>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {activeItems.length > 0 && (
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
            )}

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
                disabled={activeItems.length === 0}
                className="w-full rounded-xl border border-border bg-card text-foreground py-3 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> Surprise me
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
