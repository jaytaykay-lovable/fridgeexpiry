import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExploreMoreRow from './ExploreMoreRow';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

const mockRecipes: RecipeCardType[] = [
  { id: 4, title: 'Extra Recipe 1', image: '', readyMinutes: 20, servings: 2, likes: 100, usedIngredients: [], missedIngredients: [], matchScore: 2, reason: '', sourceUrl: '' },
  { id: 5, title: 'Extra Recipe 2', image: '', readyMinutes: 30, servings: 4, likes: 200, usedIngredients: [], missedIngredients: [], matchScore: 3, reason: '', sourceUrl: '' },
];

describe('ExploreMoreRow', () => {
  it('shows collapsed state', () => {
    render(<ExploreMoreRow recipes={mockRecipes} onSelect={() => {}} />);
    expect(screen.getByText('Explore more recipes')).toBeInTheDocument();
  });

  it('shows recipes when expanded', async () => {
    const user = userEvent.setup();
    render(<ExploreMoreRow recipes={mockRecipes} onSelect={() => {}} />);
    await user.click(screen.getByText('Explore more recipes'));
    expect(screen.getByText('Extra Recipe 1')).toBeInTheDocument();
    expect(screen.getByText('Extra Recipe 2')).toBeInTheDocument();
  });
});
