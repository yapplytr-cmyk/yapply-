-- ═══════════════════════════════════════════════════════════════
-- Yapply Token & Membership System
-- Purely additive migration — creates new tables/functions only.
-- Safe to run on production: does not modify existing tables.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Token accounts: one row per user ──
create table if not exists public.token_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  free_grant_tokens integer not null default 10,
  last_free_grant_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. Token ledger: every grant / spend / refund is a row ──
create table if not exists public.token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,            -- 'free_monthly' | 'membership_grant' | 'bid_spend' | 'refund' | 'admin_adjust' | 'purchase'
  ref_id text,                     -- listing id, stripe session id, etc.
  created_at timestamptz not null default now()
);
create index if not exists token_tx_user_idx on public.token_transactions (user_id, created_at desc);

-- ── 3. Membership plans (editable without code changes) ──
create table if not exists public.membership_plans (
  id text primary key,             -- 'starter' | 'pro' | 'elite'
  name text not null,
  price_try numeric not null,
  tokens_per_month integer not null,
  stripe_price_id text,            -- filled in once Stripe products are created
  apple_product_id text,           -- filled in once App Store products are created
  sort_order integer not null default 0,
  active boolean not null default true
);

insert into public.membership_plans (id, name, price_try, tokens_per_month, sort_order)
values
  ('starter', 'Starter', 499, 20, 1),
  ('pro', 'Pro', 999, 50, 2),
  ('elite', 'Elite', 1999, 120, 3)
on conflict (id) do nothing;

-- ── 4. Active memberships ──
create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.membership_plans(id),
  status text not null default 'active',    -- 'active' | 'past_due' | 'canceled'
  provider text not null,                    -- 'stripe' | 'apple'
  provider_ref text,                         -- stripe subscription id / apple original transaction id
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 5. Bid cost tiers by job budget (TL). Editable rows, no code changes. ──
create table if not exists public.bid_token_costs (
  id serial primary key,
  min_budget_tl numeric not null,
  max_budget_tl numeric,            -- null = no upper bound
  token_cost integer not null check (token_cost between 1 and 50),
  label text
);

insert into public.bid_token_costs (min_budget_tl, max_budget_tl, token_cost, label)
select * from (values
  (0::numeric,       50000::numeric,   1, 'Small job'),
  (50000::numeric,   150000::numeric,  2, 'Medium job'),
  (150000::numeric,  500000::numeric,  3, 'Large job'),
  (500000::numeric,  1500000::numeric, 5, 'Major project'),
  (1500000::numeric, null::numeric,    8, 'Villa / flagship')
) as seed(min_budget_tl, max_budget_tl, token_cost, label)
where not exists (select 1 from public.bid_token_costs);

-- ── 6. RLS: users read their own data; all writes go through
--        SECURITY DEFINER functions or the service role. ──
alter table public.token_accounts enable row level security;
alter table public.token_transactions enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.bid_token_costs enable row level security;

drop policy if exists "token_accounts_select_own" on public.token_accounts;
create policy "token_accounts_select_own" on public.token_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "token_tx_select_own" on public.token_transactions;
create policy "token_tx_select_own" on public.token_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "plans_public_read" on public.membership_plans;
create policy "plans_public_read" on public.membership_plans
  for select using (true);

drop policy if exists "memberships_select_own" on public.memberships;
create policy "memberships_select_own" on public.memberships
  for select using (auth.uid() = user_id);

drop policy if exists "bid_costs_public_read" on public.bid_token_costs;
create policy "bid_costs_public_read" on public.bid_token_costs
  for select using (true);

-- ── 7. Ensure an account exists + apply monthly free grant.
--        Called lazily from other functions. ──
create or replace function public._ensure_token_account(p_user_id uuid)
returns public.token_accounts
language plpgsql security definer set search_path = public
as $$
declare
  acct public.token_accounts;
begin
  insert into public.token_accounts (user_id, balance, last_free_grant_at)
  values (p_user_id, 0, null)
  on conflict (user_id) do nothing;

  select * into acct from public.token_accounts where user_id = p_user_id for update;

  -- Monthly free grant (default 10 tokens every 30 days)
  if acct.free_grant_tokens > 0 and
     (acct.last_free_grant_at is null or acct.last_free_grant_at < now() - interval '30 days') then
    update public.token_accounts
      set balance = balance + acct.free_grant_tokens,
          last_free_grant_at = now(),
          updated_at = now()
      where user_id = p_user_id
      returning * into acct;

    insert into public.token_transactions (user_id, delta, balance_after, reason)
    values (p_user_id, acct.free_grant_tokens, acct.balance, 'free_monthly');
  end if;

  return acct;
end;
$$;

-- ── 8. Read balance (auto-creates account + applies free grant) ──
create or replace function public.get_token_status(p_user_id uuid)
returns table (balance integer, free_grant_tokens integer, last_free_grant_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  acct public.token_accounts;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not allowed';
  end if;
  acct := public._ensure_token_account(p_user_id);
  return query select acct.balance, acct.free_grant_tokens, acct.last_free_grant_at;
end;
$$;

-- ── 9. Spend tokens for a bid — atomic check + deduct + ledger ──
create or replace function public.spend_tokens_for_bid(
  p_user_id uuid,
  p_listing_id text,
  p_cost integer
)
returns table (success boolean, new_balance integer, cost integer, message text)
language plpgsql security definer set search_path = public
as $$
declare
  acct public.token_accounts;
  v_cost integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not allowed';
  end if;

  -- Server-side clamp: costs must be within the configured tier range.
  select greatest(1, least(coalesce(max(token_cost), 8), coalesce(p_cost, 1)))
    into v_cost from public.bid_token_costs;

  acct := public._ensure_token_account(p_user_id);

  if acct.balance < v_cost then
    return query select false, acct.balance, v_cost, 'INSUFFICIENT_TOKENS';
    return;
  end if;

  update public.token_accounts
    set balance = balance - v_cost, updated_at = now()
    where user_id = p_user_id
    returning * into acct;

  insert into public.token_transactions (user_id, delta, balance_after, reason, ref_id)
  values (p_user_id, -v_cost, acct.balance, 'bid_spend', p_listing_id);

  return query select true, acct.balance, v_cost, 'OK';
end;
$$;

-- ── 10. Grant tokens (service-role only — used by Stripe webhook / admin) ──
create or replace function public.grant_tokens(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref text default null
)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  acct public.token_accounts;
begin
  -- Only the service role (or postgres) may call this.
  if coalesce(auth.role(), 'service_role') not in ('service_role') then
    raise exception 'not allowed';
  end if;

  if p_amount <= 0 or p_amount > 1000 then
    raise exception 'invalid amount';
  end if;

  acct := public._ensure_token_account(p_user_id);

  update public.token_accounts
    set balance = balance + p_amount, updated_at = now()
    where user_id = p_user_id
    returning * into acct;

  insert into public.token_transactions (user_id, delta, balance_after, reason, ref_id)
  values (p_user_id, p_amount, acct.balance, coalesce(p_reason, 'admin_adjust'), p_ref);

  return acct.balance;
end;
$$;

grant execute on function public.get_token_status(uuid) to authenticated;
grant execute on function public.spend_tokens_for_bid(uuid, text, integer) to authenticated;
-- grant_tokens intentionally NOT granted to authenticated — service role only.
