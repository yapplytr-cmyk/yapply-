# Yapply AI Handoff

Use this together with the full project backup zip:

- `/Users/armancakiroglu/Documents/Playground 6/yapply-backup-3-full-project.zip`

## Project root

- `/Users/armancakiroglu/Documents/Playground 6`

## What this project is

- Premium construction marketplace site for Turkey
- Static frontend with multiple HTML entry pages
- Shared JS/CSS app shell
- Separate admin dashboard
- Auth currently being migrated to Supabase while preserving the existing UI

## Main frontend entry pages

- `/Users/armancakiroglu/Documents/Playground 6/index.html`
- `/Users/armancakiroglu/Documents/Playground 6/open-marketplace.html`
- `/Users/armancakiroglu/Documents/Playground 6/professionals.html`
- `/Users/armancakiroglu/Documents/Playground 6/create-account.html`
- `/Users/armancakiroglu/Documents/Playground 6/login.html`
- `/Users/armancakiroglu/Documents/Playground 6/moderator-login.html`
- `/Users/armancakiroglu/Documents/Playground 6/admin-dashboard.html`

## Core frontend files

- `/Users/armancakiroglu/Documents/Playground 6/scripts/main.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/app.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/content/siteContent.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/moderatorPortal.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/core/auth.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/core/supabaseClient.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/core/state.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/core/marketplaceStore.js`

## Main component files

- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/navbar.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/authPages.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/openMarketplacePage.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/marketplaceSubmissionPage.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/marketplaceSubmissionSuccessPage.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/marketplaceListingDetailPage.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/adminDashboardPage.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/projects.js`
- `/Users/armancakiroglu/Documents/Playground 6/scripts/components/projectDetailPage.js`

## Styles

- `/Users/armancakiroglu/Documents/Playground 6/styles/tokens.css`
- `/Users/armancakiroglu/Documents/Playground 6/styles/base.css`
- `/Users/armancakiroglu/Documents/Playground 6/styles/components.css`
- `/Users/armancakiroglu/Documents/Playground 6/styles/sections.css`

## Backend / API files

- `/Users/armancakiroglu/Documents/Playground 6/backend/config.py`
- `/Users/armancakiroglu/Documents/Playground 6/backend/server.py`
- `/Users/armancakiroglu/Documents/Playground 6/backend/supabase.py`
- `/Users/armancakiroglu/Documents/Playground 6/api/router.py`
- `/Users/armancakiroglu/Documents/Playground 6/api/supabase_utils.py`

## Supabase migration files

- `/Users/armancakiroglu/Documents/Playground 6/supabase/schema.sql`
- `/Users/armancakiroglu/Documents/Playground 6/SUPABASE_SETUP.md`
- `/Users/armancakiroglu/Documents/Playground 6/vercel.json`

## Current auth direction

- Old custom auth is deprecated
- New intended source of truth is Supabase Auth
- Public login/signup and moderator login are being moved onto Supabase without changing the UI
- Moderator page stays separate visually
- Roles intended:
  - `client`
  - `developer`
  - `admin`

## Current production issue being worked on

- Supabase runtime config now loads successfully from `/api/auth/config`
- Public and moderator auth are mid-migration
- Current focus has been making moderator/admin login stable on Vercel without redesigning the page

## Recommended way to continue in another AI

1. Upload the full zip:
   - `/Users/armancakiroglu/Documents/Playground 6/yapply-backup-3-full-project.zip`
2. Also paste this handoff file.
3. Tell the next AI:
   - preserve UI exactly
   - do not redesign
   - continue from the Supabase auth migration already in progress


```
