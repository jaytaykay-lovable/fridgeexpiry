import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFridgeStore } from '@/store/useFridgeStore';
import { useIngestionStore } from '@/store/useIngestionStore';
import ProcessingOverlay from '@/components/ProcessingOverlay';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { createThumbnail, getThumbnailPath } from '@/lib/imageUtils';

export default function CameraPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { settings, fetchSettings } = useFridgeStore();
  const { addImageItem } = useIngestionStore();
  const [processing, setProcessing] = useState(false);

  const processFile = async (file: File) => {
    setProcessing(true);

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
        description: 'AI is processing — check your review queue',
      });

      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Processing failed',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  if (processing) return <ProcessingOverlay />;

  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <ImageIcon size={36} className="text-primary" />
        </div>
        <h1 className="font-display text-2xl font-bold">Add Food Items</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Take a photo or upload an image of your groceries
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera size={20} />
          Take Photo
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={20} />
          Upload Image
        </Button>
      </div>

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
