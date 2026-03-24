-- ============================================================
-- Yapply Marketplace: Supabase PostgreSQL Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. MARKETPLACE LISTINGS TABLE
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email TEXT,
  owner_role TEXT NOT NULL DEFAULT 'client',
  listing_type TEXT NOT NULL DEFAULT 'client',
  status TEXT NOT NULL DEFAULT 'open-for-bids',
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  timeframe TEXT DEFAULT '',
  project_type TEXT DEFAULT '',
  category TEXT DEFAULT '',
  accepted_bid_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_owner ON marketplace_listings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_type_status ON marketplace_listings(listing_type, status);
CREATE INDEX IF NOT EXISTS idx_listings_created ON marketplace_listings(created_at DESC);

-- 2. LISTING BIDS TABLE
CREATE TABLE IF NOT EXISTS listing_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  bidder_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bidder_role TEXT NOT NULL DEFAULT 'developer',
  status TEXT NOT NULL DEFAULT 'submitted',
  company_name TEXT DEFAULT '',
  bid_amount TEXT DEFAULT '',
  estimated_timeframe TEXT DEFAULT '',
  proposal_message TEXT DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for bid queries
CREATE INDEX IF NOT EXISTS idx_bids_listing ON listing_bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON listing_bids(bidder_user_id);
CREATE INDEX IF NOT EXISTS idx_bids_created ON listing_bids(created_at DESC);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_bids ENABLE ROW LEVEL SECURITY;

-- Listings: anyone can read, owners can update their own
CREATE POLICY "Listings are viewable by everyone"
  ON marketplace_listings FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert their own listings"
  ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update their own listings"
  ON marketplace_listings FOR UPDATE
  USING (auth.uid() = owner_user_id);

-- Bids: anyone can read, bidders can insert their own, listing owners can update
CREATE POLICY "Developers can insert their own bids"
  ON listing_bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_user_id);

CREATE POLICY "Bids are viewable by everyone"
  ON listing_bids FOR SELECT
  USING (true);

-- Allow listing owners to update bids on their listings (for accepting)
CREATE POLICY "Listing owners can update bids on their listings"
  ON listing_bids FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT owner_user_id FROM marketplace_listings WHERE id = listing_bids.listing_id
    )
  );

-- 4. AUTO-UPDATE updated_at ON LISTINGS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. BID COUNT VIEW (for fast queries)
CREATE OR REPLACE VIEW listing_bid_counts AS
SELECT
  listing_id,
  COUNT(*) as bid_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
FROM listing_bids
GROUP BY listing_id;
