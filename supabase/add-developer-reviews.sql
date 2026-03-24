-- Developer Reviews Table
-- Clients can leave a review for a developer after a project is completed (bid accepted).

create table if not exists public.developer_reviews (
  id uuid primary key default gen_random_uuid(),
  developer_user_id uuid not null references auth.users (id) on delete cascade,
  reviewer_user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  bid_id uuid not null references public.listing_bids (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz not null default timezone('utc', now()),

  -- One review per client per listing
  unique (reviewer_user_id, listing_id)
);

alter table public.developer_reviews enable row level security;

-- Anyone authenticated can read reviews (public profiles)
drop policy if exists "reviews_select_all" on public.developer_reviews;
create policy "reviews_select_all"
on public.developer_reviews
for select
to authenticated
using (true);

-- Only the reviewer (client) can insert their own review
drop policy if exists "reviews_insert_own" on public.developer_reviews;
create policy "reviews_insert_own"
on public.developer_reviews
for insert
to authenticated
with check (auth.uid() = reviewer_user_id);

-- No updates or deletes allowed (reviews are permanent)

-- Allow authenticated users to read any developer profile (for public profile pages)
drop policy if exists "profiles_select_developers" on public.profiles;
create policy "profiles_select_developers"
on public.profiles
for select
to authenticated
using (role = 'developer');
