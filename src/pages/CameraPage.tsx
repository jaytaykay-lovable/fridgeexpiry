import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, ImageIcon, Images } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFridgeStore } from '@/store/useFridgeStore';
import { useIngestionStore } from '@/store/useIngestionStore';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { createThumbnail, getThumbnailPath } from '@/lib/imageUtils';
import { cn } from '@/lib/utils';

export default function CameraPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const autoLaunchAttempted = useRef(false);
  const { settings, fetchSettings } = useFridgeStore();
  const { addImageItem } = useIngestionStore();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (autoLaunchAttempted.current) return;
    autoLaunchAttempted.current = true;

    const coarsePointer = window.matchMedia('only screen and (max-width: 768px)').matches;
    const hasCapture = 'mediaDevices' in navigator;
    if (!coarsePointer || !hasCapture) return;

    const timer = window.setTimeout(() => {
      cameraInputRef.current?.click();
    }, 140);

    return () => window.clearTimeout(timer);
  }, []);

  const processFile = async (file: File) => {
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!settings) await fetchSettings();

      // Upload to storage
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('fridge-images')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Generate and upload thumbnail
      try {
        const thumbBlob = await createThumbnail(file, 150, 0.7);
        const thumbPath = getThumbnailPath(path);
        await supabase.storage.from('fridge-images').upload(thumbPath, thumbBlob, {
          contentType: 'image/jpeg',
        });
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed, continuing without:', thumbErr);
      }

      // Insert into queue and trigger processing via the ingestion store
      await addImageItem(path, settings?.default_expiry_days ?? 7);

      toast({
        title: 'Image uploaded',
        description: 'AI is processing in the background. You can add more now.',
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Processing failed',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      void processFile(file);
    }
  };

  return (
    <div className="page-container relative min-h-[86vh] overflow-hidden pb-28 pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-0 top-32 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
          <ImageIcon size={36} className="text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Add Food Items</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-[26ch]">
          Take a photo or upload and review AI results in the queue.
        </p>

        <div className="mt-8 flex w-full flex-col gap-3 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm backdrop-blur">
          <Button
            size="lg"
            className="w-full gap-2 shadow-sm transition-transform duration-150 active:scale-[0.98]"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={20} />
            Take Photo
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full gap-2 transition-transform duration-150 active:scale-[0.98]"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} />
            Upload Image
          </Button>
        </div>
      </div>

      {uploading && (
        <p className="mx-auto mt-3 max-w-sm text-center text-xs text-muted-foreground">
          Uploading in background... you can keep adding photos.
        </p>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
