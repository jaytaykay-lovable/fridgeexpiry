import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFridgeStore } from '@/store/useFridgeStore';
import { useIngestionStore } from '@/store/useIngestionStore';
import FoodCard from '@/components/FoodCard';
import EditFoodModal from '@/components/EditFoodModal';
import ReviewList from '@/components/ReviewList';
import QuickAddInput from '@/components/QuickAddInput';
import ExpiryBanner from '@/components/ExpiryBanner';
import type { FoodItem } from '@/types/food';
import { FOOD_CATEGORIES } from '@/types/food';
import { Refrigerator, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StatusFilter = 'wasted' | 'active' | 'consumed';
type SortOption = 'expiry_asc' | 'expiry_desc' | 'name' | 'recent';

const STATUS_LABELS: Record<StatusFilter, string> = {
  wasted: 'Wasted',
  active: 'Active',
  consumed: 'Consumed',
};

const SORT_LABELS: Record<SortOption, string> = {
  expiry_asc: 'Expiring Soonest',
  expiry_desc: 'Expiring Latest',
  name: 'Name A–Z',
  recent: 'Recently Added',
};

export default function InventoryPage() {
  const { items, loading, fetchItems, fetchSettings, markConsumed, markWasted, restoreItem, updateItem } = useFridgeStore();
  const { subscribe, unsubscribe, fetchQueue } = useIngestionStore();
  const navigate = useNavigate();
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [flashingStatus, setFlashingStatus] = useState<StatusFilter | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('expiry_asc');

  useEffect(() => {
    fetchItems();
    fetchSettings();
    fetchQueue();
    subscribe();
    return () => unsubscribe();
  }, [fetchItems, fetchSettings, fetchQueue, subscribe, unsubscribe]);

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      // Status filter
      switch (statusFilter) {
        case 'wasted':
          return item.status === 'wasted';
        case 'active':
          return item.status === 'active';
        case 'consumed':
          return item.status === 'consumed';
      }
    });

    // Category filter
    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'expiry_asc':
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        case 'expiry_desc':
          return new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [items, statusFilter, categoryFilter, sortOption]);

  useEffect(() => {
    if (!flashingStatus) return;
    const timeout = setTimeout(() => setFlashingStatus(null), 700);
    return () => clearTimeout(timeout);
  }, [flashingStatus]);

  const handleConsume = async (id: string) => {
    const success = await markConsumed(id);
    if (success) {
      setFlashingStatus('consumed');
    }
  };

  const handleWaste = async (id: string) => {
    const success = await markWasted(id);
    if (success) {
      setFlashingStatus('wasted');
    }
  };

  const handleRestore = async (id: string) => {
    const success = await restoreItem(id);
    if (success) {
      setFlashingStatus('active');
      setEditingItem(null);
    }
  };

  const showSwipeHint = statusFilter === 'active';

  return (
    <div className="page-container">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-bold">My Fridge</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {items.filter(i => i.status === 'active').length} active item{items.filter(i => i.status === 'active').length !== 1 ? 's' : ''}
        </p>
      </header>

      <ExpiryBanner
        items={items.filter((i) => i.status === 'active')}
        onNavigate={() => navigate('/recipes')}
      />

      {/* Quick Add */}
      <QuickAddInput />

      {/* Review List (ingestion queue) */}
      <ReviewList />

      {/* Status filter chips */}
      <div className="mb-2 flex items-stretch justify-center gap-3">
        {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border ${statusFilter === status
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/40'
              } ${flashingStatus === status
                ? status === 'wasted'
                  ? 'chip-flash-wasted'
                  : 'chip-flash-consumed'
                : ''
              }`}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Category filter + Sort row */}
      <div className="flex items-center gap-2 mb-3">
        {/* Category dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-border bg-card text-foreground hover:border-primary/40 transition-colors">
              {categoryFilter ?? 'All Categories'}
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            <DropdownMenuRadioGroup value={categoryFilter ?? ''} onValueChange={(v) => setCategoryFilter(v || null)}>
              <DropdownMenuRadioItem value="">All Categories</DropdownMenuRadioItem>
              {FOOD_CATEGORIES.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>{c}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {categoryFilter && (
          <button
            onClick={() => setCategoryFilter(null)}
            className="flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-2 py-1 text-xs font-medium"
          >
            {categoryFilter}
            <X size={12} />
          </button>
        )}

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-border bg-card text-foreground hover:border-primary/40 transition-colors">
              <SlidersHorizontal size={14} />
              {SORT_LABELS[sortOption]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                <DropdownMenuRadioItem key={opt} value={opt}>{SORT_LABELS[opt]}</DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Refrigerator size={40} className="animate-pulse" />
          <p className="mt-3 text-sm">Loading your fridge…</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Refrigerator size={48} />
          <p className="mt-3 font-medium">No items found</p>
          <p className="text-sm mt-1">
            {items.length === 0 ? 'Snap a photo to add items' : 'Try changing your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onConsume={handleConsume}
              onWaste={handleWaste}
              onClick={setEditingItem}
            />
          ))}
        </div>
      )}

      {showSwipeHint && filteredItems.length > 0 && (
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Swipe right = consumed · Swipe left = wasted
        </p>
      )}

      {editingItem && (
        <EditFoodModal
          item={editingItem}
          onSave={updateItem}
          onUndo={handleRestore}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
