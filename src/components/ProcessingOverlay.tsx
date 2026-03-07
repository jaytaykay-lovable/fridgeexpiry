import { Loader2 } from 'lucide-react';

export default function ProcessingOverlay() {
  return (
    <div className="loading-overlay">
      <Loader2 size={48} className="text-primary animate-spin-slow" />
      <h3 className="mt-4 font-display text-lg font-semibold">Analyzing your food…</h3>
      <p className="mt-1 text-sm text-muted-foreground">Our AI is identifying items and expiry dates</p>
    </div>
  );
}
