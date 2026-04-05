import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRecipeStore } from '@/store/useRecipeStore';
import CookConfirmationDialog from '@/components/CookConfirmationDialog';
import { toast } from 'sonner';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRecipe, selectRecipe } = useRecipeStore();
  const [showCookDialog, setShowCookDialog] = useState(false);

  useEffect(() => {
    if (!currentRecipe) {
      // Load recipe (mock mode always returns same detail)
      selectRecipe({ id: Number(id) } as any);
    }
  }, [id, currentRecipe, selectRecipe]);

  if (!currentRecipe) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading recipe...</p>
      </div>
    );
  }

  const fridgeIngredients = currentRecipe.ingredients.filter((i) => i.inFridge);
  const missingIngredients = currentRecipe.ingredients.filter((i) => !i.inFridge);

  const handleCookConfirm = (removedIngredients: string[]) => {
    // Mock: just show toast and navigate back
    // Sub-Project 3 will wire this to actual fridge updates
    if (removedIngredients.length > 0) {
      toast.success(`Fridge updated — nice cooking! Removed ${removedIngredients.length} item${removedIngredients.length !== 1 ? 's' : ''}.`);
    } else {
      toast.info('No ingredients removed.');
    }
    setShowCookDialog(false);
    navigate('/recipes');
  };

  return (
    <div className="page-container pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-xl font-bold flex-1">{currentRecipe.title}</h1>
      </div>

      {/* Hero Image */}
      <div className="rounded-xl overflow-hidden aspect-video bg-muted mb-4">
        <img
          src={currentRecipe.image}
          alt={currentRecipe.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Metadata Bar */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
        <span>{currentRecipe.readyMinutes} min</span>
        <span>·</span>
        <span>{currentRecipe.servings} servings</span>
        <span>·</span>
        <span>♥ {currentRecipe.likes}</span>
      </div>

      {/* Ingredients */}
      <div className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Ingredients</h2>

        {fridgeIngredients.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">From your fridge</h3>
            <ul className="space-y-1.5">
              {fridgeIngredients.map((ing) => (
                <li key={ing.name} className="flex items-center gap-2 text-sm">
                  <span className="text-success">✓</span>
                  <span>{ing.amount} {ing.unit} {ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {missingIngredients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Missing</h3>
            <ul className="space-y-1.5">
              {missingIngredients.map((ing) => (
                <li key={ing.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>○</span>
                  <span>{ing.amount} {ing.unit} {ing.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Instructions */}
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

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-[64px] left-0 right-0 bg-background/95 backdrop-blur-lg border-t p-4 z-40">
        <button
          onClick={() => setShowCookDialog(true)}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          I cooked this
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
