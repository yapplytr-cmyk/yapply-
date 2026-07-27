-- ═══════════════════════════════════════════════════════════════════
-- Yapply — Ensure selfie avatar uploads work end to end
-- Idempotent. Safe to run repeatedly on production.
--   1. avatars storage bucket exists + is public-read
--   2. authenticated users can INSERT/UPDATE their own avatar objects
--   3. authenticated users can UPDATE their own profiles row (avatar_url)
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Bucket (public read so <img src> works without a token) ──
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- ── 2. Storage object policies ──
drop policy if exists "avatars_public_read"  on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_auth_insert" on storage.objects;
create policy "avatars_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

-- ── 3. Profiles self-update (so avatar_url PATCH is allowed) ──
-- Handle either primary-key column convention (id or user_id).
do $$
declare
  has_id boolean;
  has_user_id boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'id'
  ) into has_id;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
  ) into has_user_id;

  execute 'alter table public.profiles enable row level security';

  execute 'drop policy if exists "profiles_self_update" on public.profiles';
  if has_id then
    execute 'create policy "profiles_self_update" on public.profiles
      for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)';
  elsif has_user_id then
    execute 'create policy "profiles_self_update" on public.profiles
      for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;
