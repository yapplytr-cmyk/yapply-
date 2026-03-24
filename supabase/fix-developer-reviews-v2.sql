-- Fix developer_reviews: remove CASCADE on listing/bid deletion so reviews persist
-- Also add photos column for review work photos (up to 2 images stored as public URLs)

-- 1. Drop the old foreign key constraints that cascade-delete reviews
alter table public.developer_reviews
  drop constraint if exists developer_reviews_listing_id_fkey;

alter table public.developer_reviews
  drop constraint if exists developer_reviews_bid_id_fkey;

-- 2. Re-add as SET NULL so reviews survive listing/bid deletion
alter table public.developer_reviews
  alter column listing_id drop not null;

alter table public.developer_reviews
  alter column bid_id drop not null;

alter table public.developer_reviews
  add constraint developer_reviews_listing_id_fkey
  foreign key (listing_id) references public.marketplace_listings (id)
  on delete set null;

alter table public.developer_reviews
  add constraint developer_reviews_bid_id_fkey
  foreign key (bid_id) references public.listing_bids (id)
  on delete set null;

-- 3. Add photos column (array of public URLs, max 2)
alter table public.developer_reviews
  add column if not exists photos text[] default '{}';

-- 4. Create storage bucket for review photos (if not exists)
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- 5. Storage policy: authenticated users can upload to review-photos
drop policy if exists "review_photos_insert" on storage.objects;
create policy "review_photos_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'review-photos');

-- 6. Storage policy: anyone can read review photos (public)
drop policy if exists "review_photos_select" on storage.objects;
create policy "review_photos_select"
on storage.objects
for select
to public
using (bucket_id = 'review-photos');
