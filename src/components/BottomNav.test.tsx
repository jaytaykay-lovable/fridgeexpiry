import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  it('renders 4 navigation tabs', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText('Fridge')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    render(
      <MemoryRouter initialEntries={['/recipes']}>
        <BottomNav />
      </MemoryRouter>
    );
    const recipesLink = screen.getByText('Recipes');
    expect(recipesLink.closest('a')).toHaveClass('active');
  });
});
