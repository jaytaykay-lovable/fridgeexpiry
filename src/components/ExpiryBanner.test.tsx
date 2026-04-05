import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpiryBanner from './ExpiryBanner';
import type { FoodItem } from '@/types/food';

describe('ExpiryBanner', () => {
  const mockItems: FoodItem[] = [
    { id: '1', name: 'chicken', expiry_date: new Date(Date.now() + 2 * 86400000).toISOString(), status: 'active' } as FoodItem,
    { id: '2', name: 'milk', expiry_date: new Date(Date.now() + 1 * 86400000).toISOString(), status: 'active' } as FoodItem,
    { id: '3', name: 'rice', expiry_date: new Date(Date.now() + 10 * 86400000).toISOString(), status: 'active' } as FoodItem,
  ];

  it('renders with expiring item count', () => {
    render(<ExpiryBanner items={mockItems} onNavigate={() => {}} />);
    expect(screen.getByText(/2 items expiring soon/)).toBeInTheDocument();
  });

  it('does not render when no items are expiring', () => {
    const nonExpiring = mockItems.map((i) => ({
      ...i,
      expiry_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    }));
    const { container } = render(<ExpiryBanner items={nonExpiring} onNavigate={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onNavigate when clicked', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ExpiryBanner items={mockItems} onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
