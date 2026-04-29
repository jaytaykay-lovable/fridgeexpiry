-- 1. food_items: new fields
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS estimated_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS estimated_cost_sgd numeric,
  ADD COLUMN IF NOT EXISTS consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS wasted_at timestamptz;

-- We need 'expired' as a status too. The enum currently is 'active'|'consumed'|'wasted'.
-- Add 'expired' if not present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.food_status'::regtype
      AND enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.food_status ADD VALUE 'expired';
  END IF;
END$$;

-- 2. Trigger: keep consumed_at/wasted_at in sync when status flips
CREATE OR REPLACE FUNCTION public.food_items_status_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'consumed' AND NEW.consumed_at IS NULL THEN
      NEW.consumed_at := now();
    ELSIF NEW.status IN ('wasted','expired') AND NEW.wasted_at IS NULL THEN
      NEW.wasted_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status <> OLD.status THEN
      IF NEW.status = 'consumed' THEN
        NEW.consumed_at := COALESCE(NEW.consumed_at, now());
        NEW.wasted_at := NULL;
      ELSIF NEW.status IN ('wasted','expired') THEN
        NEW.wasted_at := COALESCE(NEW.wasted_at, now());
        NEW.consumed_at := NULL;
      ELSIF NEW.status = 'active' THEN
        NEW.consumed_at := NULL;
        NEW.wasted_at := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_food_items_status_timestamps ON public.food_items;
CREATE TRIGGER trg_food_items_status_timestamps
BEFORE INSERT OR UPDATE ON public.food_items
FOR EACH ROW EXECUTE FUNCTION public.food_items_status_timestamps();

-- Backfill existing rows
UPDATE public.food_items
SET consumed_at = COALESCE(consumed_at, updated_at)
WHERE status = 'consumed' AND consumed_at IS NULL;

UPDATE public.food_items
SET wasted_at = COALESCE(wasted_at, updated_at)
WHERE status = 'wasted' AND wasted_at IS NULL;

-- 3. user_settings: household_size
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS household_size integer NOT NULL DEFAULT 1;

-- 4. badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own badges" ON public.badges;
CREATE POLICY "Users can view own badges"
  ON public.badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own badges" ON public.badges;
CREATE POLICY "Users can insert own badges"
  ON public.badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. RPC: analytics_overview
CREATE OR REPLACE FUNCTION public.analytics_overview(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  kg_avoided numeric,
  kg_wasted numeric,
  money_saved_sgd numeric,
  items_consumed integer,
  items_wasted integer,
  meals_cooked integer,
  streak_days integer,
  total_kg_avoided_all_time numeric,
  total_money_saved_all_time numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_streak integer := 0;
  v_check date := current_date;
  v_has boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Streak: count consecutive days back from today with at least one consumed item
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM food_items
      WHERE user_id = uid
        AND status = 'consumed'
        AND consumed_at::date = v_check
    ) INTO v_has;
    EXIT WHEN NOT v_has;
    v_streak := v_streak + 1;
    v_check := v_check - 1;
    EXIT WHEN v_streak > 365;
  END LOOP;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN f.status = 'consumed' AND f.consumed_at >= p_start AND f.consumed_at < p_end
                      THEN COALESCE(f.estimated_weight_kg, 0.2) END), 0)::numeric AS kg_avoided,
    COALESCE(SUM(CASE WHEN f.status IN ('wasted','expired') AND f.wasted_at >= p_start AND f.wasted_at < p_end
                      THEN COALESCE(f.estimated_weight_kg, 0.2) END), 0)::numeric AS kg_wasted,
    COALESCE(SUM(CASE WHEN f.status = 'consumed' AND f.consumed_at >= p_start AND f.consumed_at < p_end
                      THEN COALESCE(f.estimated_cost_sgd, 3) END), 0)::numeric AS money_saved_sgd,
    COALESCE(SUM(CASE WHEN f.status = 'consumed' AND f.consumed_at >= p_start AND f.consumed_at < p_end
                      THEN 1 ELSE 0 END), 0)::integer AS items_consumed,
    COALESCE(SUM(CASE WHEN f.status IN ('wasted','expired') AND f.wasted_at >= p_start AND f.wasted_at < p_end
                      THEN 1 ELSE 0 END), 0)::integer AS items_wasted,
    COALESCE((SELECT COUNT(*) FROM recipe_history r
              WHERE r.user_id = uid AND r.action = 'cooked'
                AND r.created_at >= p_start AND r.created_at < p_end), 0)::integer AS meals_cooked,
    v_streak,
    COALESCE((SELECT SUM(COALESCE(estimated_weight_kg, 0.2)) FROM food_items
              WHERE user_id = uid AND status = 'consumed'), 0)::numeric AS total_kg_avoided_all_time,
    COALESCE((SELECT SUM(COALESCE(estimated_cost_sgd, 3)) FROM food_items
              WHERE user_id = uid AND status = 'consumed'), 0)::numeric AS total_money_saved_all_time
  FROM food_items f
  WHERE f.user_id = uid;
END;
$$;

-- 6. RPC: analytics_series — bucket by day/week/month
CREATE OR REPLACE FUNCTION public.analytics_series(
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text -- 'day' | 'week' | 'month'
)
RETURNS TABLE (
  bucket_start timestamptz,
  kg_avoided numeric,
  kg_wasted numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_trunc text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  v_trunc := CASE p_bucket WHEN 'week' THEN 'week' WHEN 'month' THEN 'month' ELSE 'day' END;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(date_trunc(v_trunc, p_start), date_trunc(v_trunc, p_end - interval '1 microsecond'),
      CASE v_trunc WHEN 'day' THEN interval '1 day'
                   WHEN 'week' THEN interval '1 week'
                   ELSE interval '1 month' END) AS bs
  )
  SELECT
    s.bs,
    COALESCE(SUM(CASE WHEN f.status = 'consumed'
                       AND date_trunc(v_trunc, f.consumed_at) = s.bs
                       THEN COALESCE(f.estimated_weight_kg, 0.2) END), 0)::numeric,
    COALESCE(SUM(CASE WHEN f.status IN ('wasted','expired')
                       AND date_trunc(v_trunc, f.wasted_at) = s.bs
                       THEN COALESCE(f.estimated_weight_kg, 0.2) END), 0)::numeric
  FROM series s
  LEFT JOIN food_items f ON f.user_id = uid
    AND ((f.consumed_at IS NOT NULL AND f.consumed_at >= p_start AND f.consumed_at < p_end)
      OR (f.wasted_at IS NOT NULL AND f.wasted_at >= p_start AND f.wasted_at < p_end))
  GROUP BY s.bs
  ORDER BY s.bs;
END;
$$;

-- 7. RPC: expire_overdue_items — daily job marks active items past expiry as expired
CREATE OR REPLACE FUNCTION public.expire_overdue_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.food_items
  SET status = 'expired',
      wasted_at = (expiry_date::timestamptz),
      updated_at = now()
  WHERE status = 'active'
    AND expiry_date < current_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;