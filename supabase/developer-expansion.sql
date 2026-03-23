-- ============================================================
-- Yapply Developer Account Expansion Migration
-- Adds: developer_type, business fields, bid system, membership
-- ============================================================

-- ─── 1. New columns on profiles table ────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS developer_type text CHECK (developer_type IN ('individual', 'business'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_website text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_locations text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_description text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_photos jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selfie_url text;

-- ─── 2. Developer membership / bid system columns ────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_plan text NOT NULL DEFAULT 'free' CHECK (current_plan IN ('free', 'pro40', 'unlimited'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bid_limit integer NOT NULL DEFAULT 15;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bids_used integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bid_cycle_start timestamptz NOT NULL DEFAULT timezone('utc', now());

-- ─── 3. Update handle_new_user trigger to include new fields ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, username, role, status, full_name, phone_number,
    company_name, profession_type, service_area, years_experience,
    specialties, preferred_region, website,
    developer_type, business_name, business_website,
    business_locations, business_description, portfolio_links, selfie_url
  )
  VALUES (
    new.id,
    lower(new.email),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client'),
    'active',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone_number', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'profession_type', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'service_area', '')), ''),
    nullif(new.raw_user_meta_data ->> 'years_experience', '')::integer,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'specialties', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'preferred_region', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'website', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'developer_type', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_website', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_locations', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_description', '')), ''),
    CASE
      WHEN new.raw_user_meta_data ->> 'portfolio_links' IS NOT NULL
      THEN (new.raw_user_meta_data -> 'portfolio_links')
      ELSE '[]'::jsonb
    END,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'selfie_url', '')), '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    username = coalesce(excluded.username, public.profiles.username),
    role = coalesce(excluded.role, public.profiles.role),
    full_name = excluded.full_name,
    phone_number = excluded.phone_number,
    company_name = excluded.company_name,
    profession_type = excluded.profession_type,
    service_area = excluded.service_area,
    years_experience = excluded.years_experience,
    specialties = excluded.specialties,
    preferred_region = excluded.preferred_region,
    website = excluded.website,
    developer_type = excluded.developer_type,
    business_name = excluded.business_name,
    business_website = excluded.business_website,
    business_locations = excluded.business_locations,
    business_description = excluded.business_description,
    portfolio_links = excluded.portfolio_links,
    selfie_url = excluded.selfie_url;

  RETURN new;
END;
$$;

-- ─── 4. Function to check and reset bid cycle ────────────────
CREATE OR REPLACE FUNCTION public.check_and_reset_bid_cycle(p_user_id uuid)
RETURNS TABLE(bids_remaining integer, bid_limit integer, cycle_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_start timestamptz;
  v_bids_used integer;
  v_bid_limit integer;
  v_plan text;
BEGIN
  SELECT p.bid_cycle_start, p.bids_used, p.bid_limit, p.current_plan
  INTO v_cycle_start, v_bids_used, v_bid_limit, v_plan
  FROM public.profiles p
  WHERE p.id = p_user_id AND p.role = 'developer';

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, now();
    RETURN;
  END IF;

  -- Reset cycle if 30 days have passed
  IF (now() - v_cycle_start) > interval '30 days' THEN
    UPDATE public.profiles
    SET bids_used = 0, bid_cycle_start = timezone('utc', now())
    WHERE id = p_user_id;
    v_bids_used := 0;
    v_cycle_start := timezone('utc', now());
  END IF;

  RETURN QUERY SELECT
    GREATEST(v_bid_limit - v_bids_used, 0),
    v_bid_limit,
    (v_cycle_start + interval '30 days');
END;
$$;

-- ─── 5. Function to consume a bid ────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_developer_bid(p_user_id uuid)
RETURNS TABLE(success boolean, bids_remaining integer, bid_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_start timestamptz;
  v_bids_used integer;
  v_bid_limit integer;
  v_plan text;
BEGIN
  SELECT p.bid_cycle_start, p.bids_used, p.bid_limit, p.current_plan
  INTO v_cycle_start, v_bids_used, v_bid_limit, v_plan
  FROM public.profiles p
  WHERE p.id = p_user_id AND p.role = 'developer'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;

  -- Unlimited plan never runs out
  IF v_plan = 'unlimited' THEN
    UPDATE public.profiles SET bids_used = bids_used + 1 WHERE id = p_user_id;
    RETURN QUERY SELECT true, 999, v_bid_limit;
    RETURN;
  END IF;

  -- Reset cycle if 30 days have passed
  IF (now() - v_cycle_start) > interval '30 days' THEN
    UPDATE public.profiles
    SET bids_used = 0, bid_cycle_start = timezone('utc', now())
    WHERE id = p_user_id;
    v_bids_used := 0;
    v_cycle_start := timezone('utc', now());
  END IF;

  -- Check limit
  IF v_bids_used >= v_bid_limit THEN
    RETURN QUERY SELECT false, 0, v_bid_limit;
    RETURN;
  END IF;

  -- Consume one bid
  UPDATE public.profiles SET bids_used = bids_used + 1 WHERE id = p_user_id;
  RETURN QUERY SELECT true, GREATEST(v_bid_limit - v_bids_used - 1, 0), v_bid_limit;
END;
$$;

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_and_reset_bid_cycle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_developer_bid(uuid) TO authenticated;
