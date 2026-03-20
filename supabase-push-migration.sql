-- ============================================================
-- Yapply Push Notifications — device_tokens table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Device tokens for APNs push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL,
  token       text NOT NULL,
  platform    text NOT NULL DEFAULT 'ios',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  -- Each user+token combo is unique (prevents duplicates)
  UNIQUE (user_id, token)
);

-- Index for fast lookup by user_id (used when sending push notifications)
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens (user_id);

-- Index for cleanup of stale tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_updated ON device_tokens (updated_at);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own tokens
CREATE POLICY "Users can view own device tokens"
  ON device_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can register own device tokens"
  ON device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own device tokens"
  ON device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tokens (for logout cleanup)
CREATE POLICY "Users can delete own device tokens"
  ON device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can read all tokens (for sending push notifications)
-- (service_role bypasses RLS by default, so no explicit policy needed)

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_tokens_updated_at();
