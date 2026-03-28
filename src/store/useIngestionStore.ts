import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { IngestionQueueItem } from '@/types/food';
import type { RealtimeChannel } from '@supabase/supabase-js';

const triggerQueueProcessing = async (queueId: string, defaultExpiryDays: number) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Session expired');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-food-image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        queue_id: queueId,
        default_expiry_days: defaultExpiryDays,
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Processing failed (${response.status})`);
  }
};

interface IngestionState {
  queueItems: IngestionQueueItem[];
  loading: boolean;
  channel: RealtimeChannel | null;

  // Actions
  fetchQueue: () => Promise<void>;
  subscribe: () => void;
  unsubscribe: () => void;

  // Ingestion triggers
  addImageItem: (imagePath: string, defaultExpiryDays: number) => Promise<void>;
  addTextItem: (text: string, defaultExpiryDays: number) => Promise<void>;

  // Review actions
  approveAll: () => Promise<number>;
  dismissItem: (id: string) => Promise<void>;
  dismissFailed: () => Promise<void>;
}

export const useIngestionStore = create<IngestionState>((set, get) => ({
  queueItems: [],
  loading: false,
  channel: null,

  fetchQueue: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('ingestion_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ queueItems: data as unknown as IngestionQueueItem[] });
    }
    set({ loading: false });
  },

  subscribe: () => {
    // Prevent duplicate subscriptions
    if (get().channel) return;

    const channel = supabase
      .channel('ingestion-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ingestion_queue',
        },
        (payload) => {
          const { eventType } = payload;

          if (eventType === 'INSERT') {
            const newItem = payload.new as unknown as IngestionQueueItem;
            set((s) => ({
              queueItems: [newItem, ...s.queueItems.filter((i) => i.id !== newItem.id)],
            }));
          } else if (eventType === 'UPDATE') {
            const updated = payload.new as unknown as IngestionQueueItem;
            set((s) => ({
              queueItems: s.queueItems.map((i) => (i.id === updated.id ? updated : i)),
            }));
          } else if (eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            set((s) => ({
              queueItems: s.queueItems.filter((i) => i.id !== deleted.id),
            }));
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  addImageItem: async (imagePath, defaultExpiryDays) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Insert into queue (Realtime will update the store)
    const { data: queueItem, error: queueError } = await supabase
      .from('ingestion_queue')
      .insert({
        user_id: user.id,
        input_type: 'image',
        image_path: imagePath,
        status: 'pending',
      } as any)
      .select()
      .single();

    if (queueError || !queueItem) throw queueError || new Error('Failed to create queue item');

    // Optimistically add to local state in case Realtime is slow
    const optimistic = queueItem as unknown as IngestionQueueItem;
    set((s) => ({
      queueItems: [optimistic, ...s.queueItems.filter((i) => i.id !== optimistic.id)],
    }));

    // Fire processing in the background so capture/add flows stay responsive.
    void triggerQueueProcessing((queueItem as any).id, defaultExpiryDays).catch(async (err) => {
      console.error('Background image processing trigger failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to start processing';

      await supabase
        .from('ingestion_queue')
        .update({ status: 'failed' as any, error_message: message })
        .eq('id', (queueItem as any).id);

      set((s) => ({
        queueItems: s.queueItems.map((i) =>
          i.id === (queueItem as any).id
            ? { ...i, status: 'failed', error_message: message }
            : i
        ),
      }));
    });
  },

  addTextItem: async (text, defaultExpiryDays) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: queueItem, error: queueError } = await supabase
      .from('ingestion_queue')
      .insert({
        user_id: user.id,
        input_type: 'text',
        raw_payload: text,
        status: 'pending',
      } as any)
      .select()
      .single();

    if (queueError || !queueItem) throw queueError || new Error('Failed to create queue item');

    const optimistic = queueItem as unknown as IngestionQueueItem;
    set((s) => ({
      queueItems: [optimistic, ...s.queueItems.filter((i) => i.id !== optimistic.id)],
    }));

    // Fire processing in the background so users can submit repeatedly.
    void triggerQueueProcessing((queueItem as any).id, defaultExpiryDays).catch(async (err) => {
      console.error('Background text processing trigger failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to start processing';

      await supabase
        .from('ingestion_queue')
        .update({ status: 'failed' as any, error_message: message })
        .eq('id', (queueItem as any).id);

      set((s) => ({
        queueItems: s.queueItems.map((i) =>
          i.id === (queueItem as any).id
            ? { ...i, status: 'failed', error_message: message }
            : i
        ),
      }));
    });
  },

  approveAll: async () => {
    const { data, error } = await supabase.rpc('commit_approved_items');
    if (error) throw error;

    // Remove committed items from local state
    set((s) => ({
      queueItems: s.queueItems.filter((i) => i.status !== 'completed'),
    }));

    return (data as number) || 0;
  },

  dismissItem: async (id) => {
    const prev = get().queueItems;
    set({ queueItems: prev.filter((i) => i.id !== id) });

    const { error } = await supabase
      .from('ingestion_queue')
      .delete()
      .eq('id', id);

    if (error) {
      set({ queueItems: prev });
    }
  },

  dismissFailed: async () => {
    const prev = get().queueItems;
    set({ queueItems: prev.filter((i) => i.status !== 'failed') });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('ingestion_queue')
      .delete()
      .eq('status', 'failed' as any);

    if (error) {
      set({ queueItems: prev });
    }
  },
}));
