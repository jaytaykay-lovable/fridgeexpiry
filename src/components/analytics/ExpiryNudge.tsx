import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, AlertTriangle } from 'lucide-react';
import type { FoodItem } from '@/types/food';
import { useRecipeStore } from '@/store/useRecipeStore';

interface Props {
  items: FoodItem[];
}

const daysUntil = (date: string) =>
  Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

export default function ExpiryNudge({ items }: Props) {
  const navigate = useNavigate();
  const setSelectedIngredients = useRecipeStore((s) => s.setSelectedIngredients);

  const expiring = useMemo(() => {
    return items
      .filter((i) => i.status === 'active')
      .map((i) => ({ ...i, days: daysUntil(i.expiry_date) }))
      .filter((i) => i.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [items]);

  const totalCost = expiring.reduce(
    (sum, i) => sum + (i.estimated_cost_sgd ?? 3),
    0,
  );

  const handleCookNow = (item: typeof expiring[number]) => {
    setSelectedIngredients([item.name]);
    navigate('/recipes');
  };

  return (
    <section className="rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">
          This week's fridge risk
        </h2>
        {expiring.length > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
            <AlertTriangle size={11} className="text-warning" />
            ${totalCost.toFixed(2)} at risk
          </span>
        )}
      </div>

      {expiring.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-3xl">🎉</p>
          <p className="mt-2 text-sm font-medium">Nothing expiring this week</p>
          <p className="text-xs text-muted-foreground">Great fridge management!</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            {expiring.length} item{expiring.length !== 1 ? 's' : ''} expiring in
            the next 7 days
          </p>
          <ul className="space-y-2">
            {expiring.map((item, idx) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 rounded-xl border bg-background/60 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.days <= 0
                      ? 'Expires today'
                      : item.days === 1
                        ? 'Expires tomorrow'
                        : `Expires in ${item.days} days`}
                    {' · '}
                    {(item.estimated_weight_kg ?? 0.2).toFixed(1)} kg · $
                    {(item.estimated_cost_sgd ?? 3).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => handleCookNow(item)}
                  className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition"
                >
                  <ChefHat size={12} />
                  Cook now
                </button>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
