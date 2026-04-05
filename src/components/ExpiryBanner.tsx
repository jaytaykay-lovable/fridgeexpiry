import { ArrowRight } from 'lucide-react';
import type { FoodItem } from '@/types/food';

interface ExpiryBannerProps {
  items: FoodItem[];
  onNavigate: () => void;
}

export default function ExpiryBanner({ items, onNavigate }: ExpiryBannerProps) {
  const expiringItems = items.filter((item) => {
    const days = Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return item.status === 'active' && days <= 3;
  });

  if (expiringItems.length === 0) return null;

  return (
    <button
      onClick={onNavigate}
      className="w-full flex items-center justify-between rounded-xl bg-warning/10 border border-warning/30 px-4 py-3 mb-4 text-left hover:bg-warning/15 transition-colors"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">
          {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring soon
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Find recipes to use them up
        </p>
      </div>
      <ArrowRight size={18} className="text-warning flex-shrink-0" />
    </button>
  );
}
