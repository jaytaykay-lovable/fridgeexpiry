import { motion } from 'framer-motion';
import { AlertTriangle, X, Loader2, AlertCircle } from 'lucide-react';
import type { IngestionQueueItem } from '@/types/food';

interface IngestionCardProps {
  item: IngestionQueueItem;
  onDismiss: (id: string) => void;
}

function ShimmerSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded bg-muted shimmer" />
        <div className="h-3 w-1/3 rounded bg-muted shimmer" />
      </div>
      <div className="h-3 w-12 rounded bg-muted shimmer" />
    </div>
  );
}

export default function IngestionCard({ item, onDismiss }: IngestionCardProps) {
  const isPending = item.status === 'pending' || item.status === 'processing';
  const isFailed = item.status === 'failed';
  const isCompleted = item.status === 'completed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative overflow-hidden rounded-xl border bg-card shadow-sm ${
        isFailed ? 'border-destructive/40' : item.is_flagged ? 'border-warning/60' : 'border-border'
      }`}
    >
      {isPending && <ShimmerSkeleton />}

      {isCompleted && (
        <div className="flex items-center gap-3 p-3">
          {/* Icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground text-lg">
            🍽️
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate">{item.extracted_name || 'Unknown'}</h3>
              {item.is_flagged && (
                <AlertTriangle size={14} className="text-warning flex-shrink-0" />
              )}
            </div>
            <span className="category-badge mt-0.5">
              {item.extracted_category || 'Other'}
            </span>
          </div>

          {/* Date */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-medium text-muted-foreground">
              {item.extracted_date
                ? new Date(item.extracted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '—'}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
            className="ml-1 flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isFailed && (
        <div className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Processing failed</p>
            <p className="text-xs text-muted-foreground truncate">
              {item.error_message || 'Could not identify this item'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(item.id); }}
            className="ml-1 flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
