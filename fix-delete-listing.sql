-- ============================================================
-- YAPPLY: Enable listing deletion from PG
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. RLS policy: allow authenticated users to delete listings
DROP POLICY IF EXISTS "Authenticated users can delete listings" ON marketplace_listings;
CREATE POLICY "Authenticated users can delete listings"
  ON marketplace_listings
  FOR DELETE
  TO authenticated
  USING (true);

-- 2. SECURITY DEFINER function for deletion (bypasses RLS)
--    Callable by any authenticated or anon user via RPC.
CREATE OR REPLACE FUNCTION public.delete_listing_from_pg(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM marketplace_listings WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_listing_from_pg TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_listing_from_pg TO anon;
