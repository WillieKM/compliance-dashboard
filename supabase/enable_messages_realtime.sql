-- Run this in your Supabase SQL editor
-- Enables Realtime on the messages table for the office inbox (/messages).
-- Safe because the existing RLS policy (facility_id = get_my_facility_id())
-- still applies to Realtime subscriptions for authenticated sessions — this
-- does not open any new access path. The public caregiver/family portal
-- links deliberately stay on polling (no Supabase Auth session to scope a
-- Realtime subscription to safely).

ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
