-- Adds tracking columns so the shift-reminders cron doesn't
-- re-send the same email on every 15-minute tick.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_in_reminder_sent  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS clock_out_reminder_sent BOOLEAN NOT NULL DEFAULT false;
