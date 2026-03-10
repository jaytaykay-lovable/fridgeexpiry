import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFridgeStore } from '@/store/useFridgeStore';
import ProcessingOverlay from '@/components/ProcessingOverlay';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function CameraPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { processingImage, setProcessingImage, addItems, settings, fetchSettings } = useFridgeStore();
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setProcessingImage(true);
    setPreview(URL.createObjectURL(file));

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Ensure settings loaded
      if (!settings) await fetchSettings();

      // Upload to storage
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('fridge-images')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Create a signed URL for AI processing (short-lived)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('fridge-images')
        .createSignedUrl(path, 600); // 10 min for AI processing

      if (signedError || !signedData) throw signedError || new Error('Failed to create signed URL');

      const imageUrl = signedData.signedUrl;

      // Call edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Session expired. Please log in again.');

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
            image_url: imageUrl,
            default_expiry_days: settings?.default_expiry_days ?? 7,
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Processing failed (${response.status})`);
      }

      const data = await response.json();

      const items = (data.items || []).map((item: any) => ({
        user_id: user.id,
        name: item.name,
        category: item.category || 'Other',
        expiry_date: item.expiry_date,
        is_flagged: item.is_flagged || false,
        image_url: path,
        status: 'active' as const,
      }));

      if (items.length > 0) {
        await addItems(items);
        toast({
          title: `Added ${items.length} item${items.length > 1 ? 's' : ''}`,
          description: 'Check your fridge inventory',
        });
      } else {
        toast({
          title: 'No items detected',
          description: 'Try a clearer photo of food items',
          variant: 'destructive',
        });
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Processing failed',
        description: err.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setProcessingImage(false);
      setPreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  if (processingImage) return <ProcessingOverlay />;

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
