-- Make fridge-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'fridge-images';

-- Add storage RLS policies for authenticated users to manage their own files
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fridge-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own images
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'fridge-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'fridge-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);