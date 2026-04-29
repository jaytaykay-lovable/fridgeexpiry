ALTER TABLE public.ingestion_queue
  ADD COLUMN IF NOT EXISTS extracted_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS extracted_cost_sgd numeric;

CREATE OR REPLACE FUNCTION public.commit_approved_items()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  committed_count integer;
BEGIN
  INSERT INTO public.food_items (
    user_id, name, category, expiry_date, is_flagged, image_url, status,
    estimated_weight_kg, estimated_cost_sgd
  )
  SELECT
    q.user_id,
    q.extracted_name,
    COALESCE(q.extracted_category, 'Other'),
    q.extracted_date,
    COALESCE(q.is_flagged, false),
    q.image_path,
    'active'::food_status,
    q.extracted_weight_kg,
    q.extracted_cost_sgd
  FROM public.ingestion_queue q
  WHERE q.user_id = auth.uid()
    AND q.status = 'completed';

  GET DIAGNOSTICS committed_count = ROW_COUNT;

  DELETE FROM public.ingestion_queue
  WHERE user_id = auth.uid()
    AND status = 'completed';

  RETURN committed_count;
END;
$function$;