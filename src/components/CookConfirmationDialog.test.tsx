import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CookConfirmationDialog from './CookConfirmationDialog';

describe('CookConfirmationDialog', () => {
  const mockIngredients = [
    { name: 'chicken thighs', inFridge: true },
    { name: 'ginger', inFridge: true },
    { name: 'soy sauce', inFridge: true },
  ];

  it('renders title and ingredients', () => {
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('What did you use?')).toBeInTheDocument();
    expect(screen.getByText('chicken thighs')).toBeInTheDocument();
    expect(screen.getByText('ginger')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with selected ingredients', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    await user.click(screen.getByText('Update fridge'));
    expect(onConfirm).toHaveBeenCalledWith(['chicken thighs', 'ginger', 'soy sauce']);
  });

  it('allows deselecting ingredients', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <CookConfirmationDialog
        isOpen={true}
        matchedIngredients={mockIngredients}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    // Uncheck first ingredient
    const checkbox = screen.getByRole('checkbox', { name: /chicken thighs/i });
    await user.click(checkbox);
    await user.click(screen.getByText('Update fridge'));
    expect(onConfirm).toHaveBeenCalledWith(['ginger', 'soy sauce']);
  });
});
