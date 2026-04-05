import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoodChip from './MoodChip';

describe('MoodChip', () => {
  it('renders mood label', () => {
    render(<MoodChip label="Quick" isSelected={false} onSelect={() => {}} />);
    expect(screen.getByText('Quick')).toBeInTheDocument();
  });

  it('shows selected state', () => {
    render(<MoodChip label="Comfort" isSelected={true} onSelect={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-primary');
  });

  it('shows unselected state', () => {
    render(<MoodChip label="Healthy" isSelected={false} onSelect={() => {}} />);
    const chip = screen.getByRole('button');
    expect(chip).toHaveClass('bg-card');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<MoodChip label="Fancy" isSelected={false} onSelect={onSelect} />);
    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
