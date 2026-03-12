# Yapply Supabase Auth Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run:
   - `/Users/armancakiroglu/Documents/Playground 6/supabase/schema.sql`
3. In Supabase Auth settings:
   - disable email confirmation if you want the existing instant signup + auto-login flow to remain unchanged
4. Create the admin auth user in Supabase Auth:
   - email: `armandino@yapply.internal`
   - password: `skylarkyapply877!`
5. Promote that user profile to admin with the SQL snippet at the bottom of `schema.sql`.

## Vercel environment variables

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## What uses what

- Public signup/login/logout/session: Supabase Auth in the browser
- Moderator/admin login: separate moderator page UI, same Supabase Auth source of truth
- Admin account directory/actions: Vercel serverless endpoints backed by `SUPABASE_SERVICE_ROLE_KEY`

## Deprecated auth paths

The old custom SQLite/KV/browser-mirrored auth flow is no longer intended to be the production auth source of truth.
