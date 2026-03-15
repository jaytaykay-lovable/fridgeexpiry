-- Remove old cron job and create new one with CRON_SECRET header
SELECT cron.unschedule(1);

SELECT cron.schedule(
  'check-expiry-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://eilleupxcxjpzdepruuy.supabase.co/functions/v1/check-expiry-notifications',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "16e94aba-37dc-4d08-ba52-f0c12c1a54ff"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);