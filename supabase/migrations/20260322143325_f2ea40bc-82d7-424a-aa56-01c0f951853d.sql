SELECT cron.unschedule('check-expiry-daily');

SELECT cron.schedule(
  'check-expiry-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eilleupxcxjpzdepruuy.supabase.co/functions/v1/check-expiry-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);