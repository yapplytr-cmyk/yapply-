-- Notifications table: server-side notification storage
-- Replaces localStorage-based notifications with Supabase-persisted ones

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'general',
  title text not null default '',
  message text not null default '',
  href text default '',
  listing_id uuid,
  bid_id uuid,
  sender_user_id uuid references auth.users (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

-- Index for fast lookups by user
create index if not exists idx_notifications_user_id on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read = false;

alter table public.notifications enable row level security;

-- Users can read their own notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

-- Authenticated users can insert notifications (for any user — needed for cross-user notifications)
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert"
on public.notifications
for insert
to authenticated
with check (true);

-- Users can update (mark read) their own notifications
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Users can delete their own notifications
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (auth.uid() = user_id);

-- Enable realtime for notifications table (for live badge updates)
alter publication supabase_realtime add table public.notifications;
