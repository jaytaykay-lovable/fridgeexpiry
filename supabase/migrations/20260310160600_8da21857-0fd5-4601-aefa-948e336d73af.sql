-- Enable leaked password protection (HaveIBeenPwned check)
-- This is done via Supabase Auth config, not SQL. 
-- We need to use the auth.config approach.
SELECT true;