-- 1. Drop residual public SELECT policy on storage.objects for fridge-images
DROP POLICY IF EXISTS "Anyone can view fridge images" ON storage.objects;

-- 2. Realtime channel authorization: restrict broadcast/presence subscriptions
-- Users can only subscribe to a topic that matches their own user_id namespace.
-- We use topics like "ingestion:<user_id>".
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own realtime messages" ON realtime.messages;
CREATE POLICY "Users can read own realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'ingestion:' || auth.uid()::text
);

DROP POLICY IF EXISTS "Users can send own realtime messages" ON realtime.messages;
CREATE POLICY "Users can send own realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'ingestion:' || auth.uid()::text
);