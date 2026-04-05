import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IngredientChip from './IngredientChip';

describe('IngredientChip', () => {
  it('renders ingredient name', () => {
    render(<IngredientChip name="chicken" isSelected={false} onToggle={() => {}} />);
    expect(screen.getByText('chicken')).toBeInTheDocument();
  });

  it('shows selected state', () => {
    render(<IngredientChip name="chicken" isSelected={true} onToggle={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-primary');
  });

  it('shows unselected state', () => {
    render(<IngredientChip name="chicken" isSelected={false} onToggle={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-card');
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<IngredientChip name="chicken" isSelected={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows expiry countdown when provided', () => {
    render(
      <IngredientChip
        name="milk"
        isSelected={false}
        onToggle={() => {}}
        expiryDays={2}
      />
    );
    expect(screen.getByText('2d left')).toBeInTheDocument();
  });
});
