import { useState } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import type { FoodItem } from '@/types/food';
import { FOOD_CATEGORIES } from '@/types/food';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditFoodModalProps {
  item: FoodItem;
  onSave: (id: string, updates: { name: string; category: string; expiry_date: string }) => void;
  onClose: () => void;
}

export default function EditFoodModal({ item, onSave, onClose }: EditFoodModalProps) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [expiryDate, setExpiryDate] = useState(
    format(new Date(item.expiry_date), 'yyyy-MM-dd')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.id, { name, category, expiry_date: expiryDate });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[95] w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-card p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold">Edit Item</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        {item.is_flagged && (
          <div className="mb-4 rounded-lg bg-flagged/20 border border-warning px-3 py-2 text-xs text-warning-foreground">
            ⚠️ This item's expiry date was estimated. Please verify.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {FOOD_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expiry">Expiry Date</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
