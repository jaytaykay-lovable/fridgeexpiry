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
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  LOOP
    SELECT EXISTS (
      SELECT 1 FROM food_items
      WHERE user_id = uid AND status = 'consumed'
        AND consumed_at::date = v_check
    ) INTO v_has;
    EXIT WHEN NOT v_has;
    v_streak := v_streak + 1;
    v_check := v_check - 1;
    EXIT WHEN v_streak > 365;
  END LOOP;

  RETURN QUERY
  WITH effective AS (
    SELECT
      f.*,
      CASE
        WHEN f.status = 'active' AND f.expiry_date < current_date THEN 'expired'::text
        ELSE f.status::text
      END AS eff_status,
      CASE
        WHEN f.status = 'active' AND f.expiry_date < current_date THEN f.expiry_date::timestamptz
        ELSE f.wasted_at
      END AS eff_wasted_at
    FROM food_items f
    WHERE f.user_id = uid
  )
  SELECT
    COALESCE(SUM(CASE WHEN eff_status = 'consumed' AND consumed_at >= p_start AND consumed_at < p_end
                      THEN COALESCE(estimated_weight_kg, 0.2) END), 0)::numeric,
    COALESCE(SUM(CASE WHEN eff_status IN ('wasted','expired') AND eff_wasted_at >= p_start AND eff_wasted_at < p_end
                      THEN COALESCE(estimated_weight_kg, 0.2) END), 0)::numeric,
    COALESCE(SUM(CASE WHEN eff_status = 'consumed' AND consumed_at >= p_start AND consumed_at < p_end
                      THEN COALESCE(estimated_cost_sgd, 3) END), 0)::numeric,
    COALESCE(SUM(CASE WHEN eff_status = 'consumed' AND consumed_at >= p_start AND consumed_at < p_end
                      THEN 1 ELSE 0 END), 0)::integer,
    COALESCE(SUM(CASE WHEN eff_status IN ('wasted','expired') AND eff_wasted_at >= p_start AND eff_wasted_at < p_end
                      THEN 1 ELSE 0 END), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM recipe_history r
              WHERE r.user_id = uid AND r.action = 'cooked'
                AND r.created_at >= p_start AND r.created_at < p_end), 0)::integer,
    v_streak,
    COALESCE(SUM(CASE WHEN eff_status = 'consumed' THEN COALESCE(estimated_weight_kg, 0.2) END), 0)::numeric,
    COALESCE(SUM(CASE WHEN eff_status = 'consumed' THEN COALESCE(estimated_cost_sgd, 3) END), 0)::numeric
  FROM effective;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_overview(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_overview(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.analytics_series(
  p_start timestamptz,
  p_end timestamptz,
  p_bucket text
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
  WITH effective AS (
    SELECT
      f.*,
      CASE
        WHEN f.status = 'active' AND f.expiry_date < current_date THEN 'expired'::text
        ELSE f.status::text
      END AS eff_status,
      CASE
        WHEN f.status = 'active' AND f.expiry_date < current_date THEN f.expiry_date::timestamptz
        ELSE f.wasted_at
      END AS eff_wasted_at
    FROM food_items f
    WHERE f.user_id = uid
  ),
  series AS (
    SELECT generate_series(date_trunc(v_trunc, p_start), date_trunc(v_trunc, p_end - interval '1 microsecond'),
      CASE v_trunc WHEN 'day' THEN interval '1 day'
                   WHEN 'week' THEN interval '1 week'
                   ELSE interval '1 month' END) AS bs
  )
  SELECT
    s.bs,
    COALESCE(SUM(CASE WHEN e.eff_status = 'consumed' AND date_trunc(v_trunc, e.consumed_at) = s.bs
                       THEN COALESCE(e.estimated_weight_kg, 0.2) END), 0)::numeric,
    COALESCE(SUM(CASE WHEN e.eff_status IN ('wasted','expired') AND date_trunc(v_trunc, e.eff_wasted_at) = s.bs
                       THEN COALESCE(e.estimated_weight_kg, 0.2) END), 0)::numeric
  FROM series s
  LEFT JOIN effective e ON
    (e.consumed_at IS NOT NULL AND e.consumed_at >= p_start AND e.consumed_at < p_end)
    OR (e.eff_wasted_at IS NOT NULL AND e.eff_wasted_at >= p_start AND e.eff_wasted_at < p_end)
  GROUP BY s.bs
  ORDER BY s.bs;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_series(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_series(timestamptz, timestamptz, text) TO authenticated;