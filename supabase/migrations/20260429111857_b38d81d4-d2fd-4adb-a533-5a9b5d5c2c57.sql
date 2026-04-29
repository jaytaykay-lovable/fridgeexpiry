REVOKE ALL ON FUNCTION public.analytics_overview(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_overview(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_series(timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_series(timestamptz, timestamptz, text) TO authenticated;

REVOKE ALL ON FUNCTION public.expire_overdue_items() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_items() TO service_role;

REVOKE ALL ON FUNCTION public.food_items_status_timestamps() FROM PUBLIC, anon, authenticated;