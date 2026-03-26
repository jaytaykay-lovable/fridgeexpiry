
-- Create ingestion_queue table
CREATE TABLE public.ingestion_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  input_type text NOT NULL DEFAULT 'image' CHECK (input_type IN ('text', 'voice', 'image')),
  raw_payload text,
  image_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_name text,
  extracted_date date,
  extracted_category text,
  is_flagged boolean DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingestion_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own queue items"
  ON public.ingestion_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items"
  ON public.ingestion_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON public.ingestion_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON public.ingestion_queue FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role needs to update queue items from edge functions
-- (service role bypasses RLS, so no extra policy needed)

-- Enable Realtime on ingestion_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingestion_queue;

-- Create commit_approved_items RPC
CREATE OR REPLACE FUNCTION public.commit_approved_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  committed_count integer;
BEGIN
  -- Insert completed queue items into food_items
  INSERT INTO public.food_items (user_id, name, category, expiry_date, is_flagged, image_url, status)
  SELECT
    q.user_id,
    q.extracted_name,
    COALESCE(q.extracted_category, 'Other'),
    q.extracted_date,
    COALESCE(q.is_flagged, false),
    q.image_path,
    'active'::food_status
  FROM public.ingestion_queue q
  WHERE q.user_id = auth.uid()
    AND q.status = 'completed';

  GET DIAGNOSTICS committed_count = ROW_COUNT;

  -- Delete committed items from queue
  DELETE FROM public.ingestion_queue
  WHERE user_id = auth.uid()
    AND status = 'completed';

  RETURN committed_count;
END;
$$;
