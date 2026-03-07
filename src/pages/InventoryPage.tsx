import { useEffect, useState } from 'react';
import { useFridgeStore } from '@/store/useFridgeStore';
import FoodCard from '@/components/FoodCard';
import EditFoodModal from '@/components/EditFoodModal';
import type { FoodItem } from '@/types/food';
import { Refrigerator } from 'lucide-react';

export default function InventoryPage() {
  const { items, loading, fetchItems, markConsumed, markWasted, updateItem } = useFridgeStore();
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="page-container">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-bold">My Fridge</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {items.length} item{items.length !== 1 ? 's' : ''} tracked
        </p>
      </header>

      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Refrigerator size={40} className="animate-pulse" />
          <p className="mt-3 text-sm">Loading your fridge…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Refrigerator size={48} />
          <p className="mt-3 font-medium">Your fridge is empty</p>
          <p className="text-sm mt-1">Snap a photo to add items</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onConsume={markConsumed}
              onWaste={markWasted}
              onClick={setEditingItem}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-center text-[10px] text-muted-foreground">
        Swipe right = consumed · Swipe left = wasted
      </p>

      {editingItem && (
        <EditFoodModal
          item={editingItem}
          onSave={updateItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
