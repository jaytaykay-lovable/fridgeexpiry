import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'fridge-images';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

export function useSignedUrl(imageUrl: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setSignedUrl(null);
      return;
    }

    // If it's already a data URL, use as-is
    if (imageUrl.startsWith('data:')) {
      setSignedUrl(imageUrl);
      return;
    }

    // Extract the storage path from a full URL or use as path directly
    let storagePath = imageUrl;
    const bucketPrefix = `/storage/v1/object/public/${BUCKET}/`;
    const bucketPrefixAlt = `/storage/v1/object/${BUCKET}/`;

    if (imageUrl.includes(bucketPrefix)) {
      storagePath = imageUrl.split(bucketPrefix)[1];
    } else if (imageUrl.includes(bucketPrefixAlt)) {
      storagePath = imageUrl.split(bucketPrefixAlt)[1];
    } else if (imageUrl.startsWith('http')) {
      // Legacy full URL that doesn't match our bucket - use as-is
      setSignedUrl(imageUrl);
      return;
    }

    supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to create signed URL:', error);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [imageUrl]);

  return signedUrl;
}
