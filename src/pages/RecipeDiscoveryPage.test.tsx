import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipeDiscoveryPage } from './RecipeDiscoveryPage';
import { useRecipeStore } from '@/store/useRecipeStore';

describe('RecipeDiscoveryPage', () => {
  beforeEach(() => {
    useRecipeStore.getState().clearResults();
    useRecipeStore.getState().setSelectedIngredients(['chicken', 'ginger']);
  });

  it('renders header title', () => {
    render(<RecipeDiscoveryPage />);
    expect(screen.getByText("What are we cooking?")).toBeInTheDocument();
  });

  it('renders ingredient chips for selected ingredients', () => {
    render(<RecipeDiscoveryPage />);
    expect(screen.getByText('chicken')).toBeInTheDocument();
    expect(screen.getByText('ginger')).toBeInTheDocument();
  });

  it('renders mood chips', () => {
    render(<RecipeDiscoveryPage />);
    expect(screen.getByText('Quick')).toBeInTheDocument();
    expect(screen.getByText('Comfort')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Fancy')).toBeInTheDocument();
  });

  it('disables Find recipes when no ingredients selected', () => {
    useRecipeStore.getState().setSelectedIngredients([]);
    render(<RecipeDiscoveryPage />);
    const button = screen.getByText('Find recipes');
    expect(button).toBeDisabled();
  });

  it('shows results state after search', async () => {
    const user = userEvent.setup();
    render(<RecipeDiscoveryPage />);
    await user.click(screen.getByText('Find recipes'));
    // Should show loading then results
    expect(screen.getByText(/Looking at your ingredients|Checking recipe options|Found some great matches/)).toBeInTheDocument();
  });
});
