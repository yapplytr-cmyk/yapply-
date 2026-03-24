-- ============================================================
-- YAPPLY MARKETPLACE FIX — Run this in Supabase SQL Editor
-- ============================================================
-- This script creates a helper function to sync listings into PG
-- and relaxes the INSERT policy so any authenticated user can
-- create listings (needed for the ensureListingInPg flow).
--
-- IMPORTANT: Do NOT drop the FK constraint on listing_bids.
-- PostgREST needs the FK to resolve embedded joins like:
--   SELECT *, listing_bids(...) FROM marketplace_listings
-- Dropping it breaks ALL listing queries across the app.
-- The ensure_listing_in_pg function prevents FK violations
-- by syncing the listing to PG before inserting a bid.
-- ============================================================

-- 1. Ensure the FK constraint exists (re-add if previously dropped)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'listing_bids_listing_id_fkey'
      AND table_name = 'listing_bids'
  ) THEN
    ALTER TABLE listing_bids
      ADD CONSTRAINT listing_bids_listing_id_fkey
      FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Create a SECURITY DEFINER function that any authenticated user
--    can call to ensure a listing exists in PG before placing a bid.
--    This runs with service-role privileges, bypassing RLS.
CREATE OR REPLACE FUNCTION public.ensure_listing_in_pg(
  p_id UUID,
  p_owner_user_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT '',
  p_listing_type TEXT DEFAULT 'client',
  p_status TEXT DEFAULT 'open-for-bids',
  p_description TEXT DEFAULT '',
  p_location TEXT DEFAULT '',
  p_budget TEXT DEFAULT '',
  p_timeframe TEXT DEFAULT '',
  p_project_type TEXT DEFAULT '',
  p_category TEXT DEFAULT '',
  p_owner_email TEXT DEFAULT '',
  p_owner_role TEXT DEFAULT 'client',
  p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO marketplace_listings (
    id, owner_user_id, title, listing_type, status, description,
    location, budget, timeframe, project_type, category,
    owner_email, owner_role, payload
  ) VALUES (
    p_id, p_owner_user_id, p_title, p_listing_type, p_status,
    p_description, p_location, p_budget, p_timeframe,
    p_project_type, p_category, p_owner_email, p_owner_role, p_payload
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN p_id;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.ensure_listing_in_pg TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_listing_in_pg TO anon;

-- 3. Relax the INSERT policy on marketplace_listings
--    Any authenticated user should be able to create listings.
DROP POLICY IF EXISTS "Owners can insert their own listings" ON marketplace_listings;
DROP POLICY IF EXISTS "Authenticated users can insert listings" ON marketplace_listings;
CREATE POLICY "Authenticated users can insert listings"
  ON marketplace_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Done! The app can now:
-- a) Sync listings to PG via the ensure_listing_in_pg function
-- b) Insert bids (FK is preserved, ensureListingInPg prevents violations)
-- c) Any authenticated user can create listings
