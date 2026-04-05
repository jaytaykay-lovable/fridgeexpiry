import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecipeDetailPage from './RecipeDetailPage';
import { useRecipeStore } from '@/store/useRecipeStore';
import { MOCK_RECIPE_DETAIL } from '@/test/recipe-utils';

const renderWithRouter = () => {
  useRecipeStore.setState({ currentRecipe: MOCK_RECIPE_DETAIL });
  return render(
    <MemoryRouter initialEntries={['/recipes/1']}>
      <Routes>
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('RecipeDetailPage', () => {
  it('renders recipe title', () => {
    renderWithRouter();
    expect(screen.getByText('Ginger Soy Chicken Stir-Fry')).toBeInTheDocument();
  });

  it('renders ingredients from fridge', () => {
    renderWithRouter();
    expect(screen.getByText('From your fridge')).toBeInTheDocument();
    expect(screen.getByText('chicken thighs')).toBeInTheDocument();
  });

  it('renders missing ingredients', () => {
    renderWithRouter();
    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.getByText('sesame oil')).toBeInTheDocument();
  });

  it('renders instructions', () => {
    renderWithRouter();
    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText(/Mix soy sauce, grated ginger/)).toBeInTheDocument();
  });

  it('renders I cooked this button', () => {
    renderWithRouter();
    expect(screen.getByText('I cooked this')).toBeInTheDocument();
  });
});
