import { describe, it, expect, beforeEach } from 'vitest';
import { useRecipeStore } from './useRecipeStore';

describe('useRecipeStore', () => {
  beforeEach(() => {
    useRecipeStore.setState({
      selectedIngredients: [],
      mood: null,
      results: [],
      currentRecipe: null,
      isLoading: false,
      loadingNarration: '',
    });
  });

  it('should toggle ingredient selection', () => {
    useRecipeStore.getState().toggleIngredient('chicken');
    expect(useRecipeStore.getState().selectedIngredients).toContain('chicken');

    useRecipeStore.getState().toggleIngredient('chicken');
    expect(useRecipeStore.getState().selectedIngredients).not.toContain('chicken');
  });

  it('should set mood', () => {
    useRecipeStore.getState().setMood('quick');
    expect(useRecipeStore.getState().mood).toBe('quick');

    useRecipeStore.getState().setMood('comfort');
    expect(useRecipeStore.getState().mood).toBe('comfort');
  });

  it('should clear results', () => {
    useRecipeStore.setState({ results: [{ id: 1 } as any] });
    useRecipeStore.getState().clearResults();
    expect(useRecipeStore.getState().results).toHaveLength(0);
  });

  it('should search recipes and return results', async () => {
    useRecipeStore.getState().setSelectedIngredients(['chicken', 'ginger']);
    await useRecipeStore.getState().searchRecipes();
    expect(useRecipeStore.getState().results.length).toBeGreaterThan(0);
    expect(useRecipeStore.getState().isLoading).toBe(false);
  });
});
