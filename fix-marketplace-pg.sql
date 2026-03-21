-- ============================================================
-- YAPPLY MARKETPLACE FIX — Run this in Supabase SQL Editor
-- ============================================================
-- This script fixes the bid submission error:
--   "violates foreign key constraint listing_bids_listing_id_fkey"
-- It also creates a helper function to sync listings into PG.
-- ============================================================

-- 1. Drop the foreign key constraint on listing_bids.listing_id
--    This allows bids to be stored even if the listing hasn't been
--    migrated to PG yet (it might still be in Cloud Storage).
ALTER TABLE listing_bids
  DROP CONSTRAINT IF EXISTS listing_bids_listing_id_fkey;

-- 2. Also change listing_id to NOT require a reference
--    (make it just a plain UUID column)
ALTER TABLE listing_bids
  ALTER COLUMN listing_id SET NOT NULL;

-- 3. Create a SECURITY DEFINER function that any authenticated user
--    can call to ensure a listing exists in PG.
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

-- 4. Relax the INSERT policy on marketplace_listings
--    Any authenticated user should be able to create listings.
DROP POLICY IF EXISTS "Owners can insert their own listings" ON marketplace_listings;
CREATE POLICY "Authenticated users can insert listings"
  ON marketplace_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Clean up any test/demo listings that shouldn't be there
-- (Uncomment and modify if you want to delete specific test listings)
-- DELETE FROM marketplace_listings WHERE title LIKE '%test%';

-- Done! The app can now:
-- a) Insert bids without FK constraint errors
-- b) Sync listings to PG via the ensure_listing_in_pg function
-- c) Any authenticated user can create listings
