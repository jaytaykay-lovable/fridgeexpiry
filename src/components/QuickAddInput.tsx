import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useIngestionStore } from '@/store/useIngestionStore';
import { useFridgeStore } from '@/store/useFridgeStore';
import { toast } from 'sonner';

export default function QuickAddInput() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const addTextItem = useIngestionStore((s) => s.addTextItem);
  const settings = useFridgeStore((s) => s.settings);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setText('');

    try {
      await addTextItem(trimmed, settings?.default_expiry_days ?? 7);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Quick add: milk, eggs, cheese…"
        className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-shadow"
        disabled={submitting}
      />
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleSubmit}
        disabled={!text.trim() || submitting}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm disabled:opacity-50 transition-opacity"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
      </motion.button>
    </div>
  );
}
