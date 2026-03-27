import { AnimatePresence, motion } from 'framer-motion';
import { Check, Trash2 } from 'lucide-react';
import { useIngestionStore } from '@/store/useIngestionStore';
import { useFridgeStore } from '@/store/useFridgeStore';
import IngestionCard from '@/components/IngestionCard';
import { toast } from 'sonner';

export default function ReviewList() {
  const { queueItems, approveAll, dismissItem, dismissFailed } = useIngestionStore();
  const fetchItems = useFridgeStore((s) => s.fetchItems);

  const completed = queueItems.filter((i) => i.status === 'completed');
  const pending = queueItems.filter((i) => i.status === 'pending' || i.status === 'processing');
  const failed = queueItems.filter((i) => i.status === 'failed');

  const visible = [...pending, ...completed, ...failed];
  if (visible.length === 0) return null;

  const handleApprove = async () => {
    try {
      const count = await approveAll();
      await fetchItems();
      toast.success(`${count} item${count !== 1 ? 's' : ''} added to your fridge`);
    } catch {
      toast.error('Failed to approve items');
    }
  };

  const handleDismissFailed = async () => {
    try {
      await dismissFailed();
    } catch {
      toast.error('Failed to dismiss items');
    }
  };

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Review
          {pending.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-bold">
              {pending.length} processing
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {failed.length > 0 && (
            <button
              onClick={handleDismissFailed}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <Trash2 size={12} />
              Clear failed
            </button>
          )}
          {completed.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleApprove}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Check size={14} />
              Approve {completed.length}
            </motion.button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visible.map((item) => (
            <IngestionCard key={item.id} item={item} onDismiss={dismissItem} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
