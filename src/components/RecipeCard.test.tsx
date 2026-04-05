import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeCard from './RecipeCard';
import type { RecipeCard as RecipeCardType } from '@/types/recipe';

const mockRecipe: RecipeCardType = {
  id: 1,
  title: 'Ginger Soy Chicken Stir-Fry',
  image: 'https://example.com/chicken.jpg',
  readyMinutes: 25,
  servings: 4,
  likes: 342,
  usedIngredients: ['chicken', 'ginger', 'soy sauce'],
  missedIngredients: ['sesame oil', 'rice vinegar'],
  matchScore: 3,
  reason: 'Great way to use your expiring chicken',
  sourceUrl: 'https://example.com/recipe/1',
};

describe('RecipeCard', () => {
  it('renders recipe title', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('Ginger Soy Chicken Stir-Fry')).toBeInTheDocument();
  });

  it('renders metadata (cook time, servings, likes)', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('4 servings')).toBeInTheDocument();
    expect(screen.getByText('♥ 342')).toBeInTheDocument();
  });

  it('renders ingredient match badge', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('Uses 3 selected items')).toBeInTheDocument();
  });

  it('renders missing ingredients count', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('2 missing')).toBeInTheDocument();
  });

  it('expands missing ingredients when clicked', async () => {
    const user = userEvent.setup();
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    await user.click(screen.getByText('2 missing'));
    expect(screen.getByText('sesame oil')).toBeInTheDocument();
    expect(screen.getByText('rice vinegar')).toBeInTheDocument();
  });

  it('renders reason text', () => {
    render(<RecipeCard recipe={mockRecipe} onView={() => {}} />);
    expect(screen.getByText('Great way to use your expiring chicken')).toBeInTheDocument();
  });

  it('calls onView when View recipe button is clicked', async () => {
    const onView = vi.fn();
    const user = userEvent.setup();
    render(<RecipeCard recipe={mockRecipe} onView={onView} />);
    await user.click(screen.getByText('View recipe'));
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
