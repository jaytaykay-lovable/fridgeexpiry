import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRecipeStore } from '@/store/useRecipeStore';
import { useFridgeStore } from '@/store/useFridgeStore';
import { supabase } from '@/integrations/supabase/client';
import CookConfirmationDialog from '@/components/CookConfirmationDialog';
import { toast } from 'sonner';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRecipe, selectRecipe, isLoadingDetail, error, clearCurrentRecipe } = useRecipeStore();
  const { items, markConsumed } = useFridgeStore();
  const [showCookDialog, setShowCookDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id && (!currentRecipe || currentRecipe.id !== Number(id))) {
      selectRecipe({ id: Number(id) });
    }
    return () => {
      // Don't clear here — list might re-use the data
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoadingDetail || !currentRecipe) {
    return (
      <div className="page-container flex flex-col items-center justify-center py-20 gap-3">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              Go back
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading recipe...</p>
          </>
        )}
      </div>
    );
  }

  const fridgeIngredients = currentRecipe.ingredients?.filter((i) => i.inFridge) || [];
  const missingIngredients = currentRecipe.ingredients?.filter((i) => !i.inFridge) || [];

  const findFridgeItemByIngredient = (ingredientName: string) => {
    const lower = ingredientName.toLowerCase();
    return items.find(
      (it) => it.status === 'active' && (it.name.toLowerCase().includes(lower) || lower.includes(it.name.toLowerCase())),
    );
  };

  const handleCookConfirm = async (removedIngredients: string[]) => {
    setSubmitting(true);

    let removedCount = 0;
    for (const ingName of removedIngredients) {
      const fridgeItem = findFridgeItemByIngredient(ingName);
      if (fridgeItem) {
        const ok = await markConsumed(fridgeItem.id);
        if (ok) removedCount++;
      }
    }

    // Log "cooked" event
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('recipe_history').insert({
        user_id: userData.user.id,
        spoonacular_id: currentRecipe.id,
        title: currentRecipe.title,
        image_url: currentRecipe.image,
        action: 'cooked',
        ingredients_used: removedIngredients,
        waste_saved_sgd: removedCount * 3, // rough estimate $3 per item
      });
    }

    setSubmitting(false);
    setShowCookDialog(false);

    if (removedCount > 0) {
      toast.success(`Nice cooking! Removed ${removedCount} item${removedCount !== 1 ? 's' : ''} from your fridge.`);
    } else {
      toast.info('Recipe logged. Nothing removed from your fridge.');
    }
    clearCurrentRecipe();
    navigate('/recipes');
  };

  const openSourceUrl = () => {
    if (currentRecipe.sourceUrl) {
      window.open(currentRecipe.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="page-container pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-xl font-bold flex-1 line-clamp-2">{currentRecipe.title}</h1>
      </div>

      {/* Hero Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl overflow-hidden aspect-video bg-muted mb-4 relative"
      >
        {currentRecipe.image ? (
          <img
            src={currentRecipe.image}
            alt={currentRecipe.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
      </motion.div>

      {/* Metadata Bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4 flex-wrap">
        <span>{currentRecipe.readyMinutes} min</span>
        <span>·</span>
        <span>{currentRecipe.servings} servings</span>
        {currentRecipe.likes > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Heart size={12} className="fill-current" /> {currentRecipe.likes}
            </span>
          </>
        )}
      </div>

      {/* Source link */}
      {currentRecipe.sourceUrl && (
        <button
          onClick={openSourceUrl}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mb-6 font-medium"
        >
          <ExternalLink size={14} /> View original recipe
        </button>
      )}

      {/* Ingredients */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Ingredients</h2>

        {fridgeIngredients.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-success uppercase tracking-wide mb-2">From your fridge</h3>
            <ul className="space-y-1.5">
              {fridgeIngredients.map((ing) => (
                <li key={ing.name} className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>
                    {ing.amount && `${ing.amount} `}{ing.unit && `${ing.unit} `}{ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingIngredients.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Missing</h3>
            <ul className="space-y-1.5">
              {missingIngredients.map((ing) => (
                <li key={ing.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>○</span>
                  <span>
                    {ing.amount && `${ing.amount} `}{ing.unit && `${ing.unit} `}{ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Instructions */}
      {currentRecipe.instructions && currentRecipe.instructions.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">Instructions</h2>
          <ol className="space-y-4">
            {currentRecipe.instructions.map((step) => (
              <li key={step.step} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center mt-0.5">
                  {step.step}
                </span>
                <p className="text-sm leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-[64px] left-0 right-0 bg-background/95 backdrop-blur-lg border-t p-4 z-40">
        <button
          onClick={() => setShowCookDialog(true)}
          disabled={submitting || fridgeIngredients.length === 0}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Updating...' : "I cooked this"}
        </button>
      </div>

      {/* Cook Dialog */}
      <CookConfirmationDialog
        isOpen={showCookDialog}
        matchedIngredients={fridgeIngredients.map((i) => ({ name: i.name, inFridge: true }))}
        onConfirm={handleCookConfirm}
        onCancel={() => setShowCookDialog(false)}
      />
    </div>
  );
}
