create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  username text unique,
  role text not null check (role in ('client', 'developer', 'admin')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  full_name text not null default '',
  phone_number text,
  company_name text,
  profession_type text,
  service_area text,
  years_experience integer,
  specialties text,
  preferred_region text,
  website text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_profiles_updated on public.profiles;
create trigger on_profiles_updated
before update on public.profiles
for each row execute function public.touch_profile_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    username,
    role,
    status,
    full_name,
    phone_number,
    company_name,
    profession_type,
    service_area,
    years_experience,
    specialties,
    preferred_region,
    website
  )
  values (
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
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'website', '')), '')
  )
  on conflict (id) do update
  set
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
    website = excluded.website;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- After creating the admin user in Supabase Auth with:
--   email: armandino@yapply.internal
-- promote the linked profile to admin:
--
-- update public.profiles
-- set
--   username = 'armandino',
--   role = 'admin',
--   status = 'active',
--   full_name = 'Armandino'
-- where email = 'armandino@yapply.internal';
