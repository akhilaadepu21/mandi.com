# Mandi.com — Restaurant Operating System

A multi-tenant restaurant platform: table QR ordering with a cinematic video
menu, real-time kitchen display, staff floor management, sandbox billing, an
owner dashboard with live analytics, and AI business insights + assistant.

Built with Next.js (App Router) + TypeScript + Tailwind + Framer Motion on
top of Supabase (Postgres, Auth, Realtime, Storage).

## Architecture at a glance

- **Multi-tenant by design**: every business table carries `restaurant_id`.
  Row Level Security enforces tenant isolation and role checks — see
  `supabase/migrations/0002_rls.sql`.
- **The browser is never trusted with identity.** Anonymous customers never
  send a `restaurant_id`/`table_id` — every write goes through a
  `SECURITY DEFINER` RPC (`supabase/migrations/0003_rpc.sql`) that resolves
  the restaurant/table from an unguessable per-table `qr_token`, and computes
  prices from the database, never from the client.
- **Realtime**: kitchen/staff/owner (authenticated) subscribe to
  `postgres_changes`, authorized by the same RLS policies as a normal query.
  The anonymous customer's order tracker uses Realtime Broadcast on a channel
  keyed by `order:<id>:<access_token>` (the token is the capability), with a
  6s poll as a resilience fallback — not a replacement.
- **Payments are sandboxed and labeled as such everywhere.** The service is
  structured (`rpc_record_sandbox_payment`) so a real gateway can be dropped
  in without changing the calling code.
- **AI**: `/owner/ai` shows two different things on purpose —
  computed, explainable insights (a deterministic rules engine over real
  orders/analytics, see `src/lib/data/insights.ts`, never an LLM guess), and
  a separate AI Assistant chat backed by a real Claude API call
  (`/api/ai/assistant`) grounded in the same live data. Without
  `ANTHROPIC_API_KEY` the assistant shows a clear "not configured" state —
  it never fabricates answers.

## Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase`) + Docker Desktop for local dev

## Setup

```bash
npm install

# Start local Supabase (Postgres + Auth + Realtime + Storage + Studio)
npx supabase start
# Copy the printed API URL / anon key / service_role key into .env.local

cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# optionally ANTHROPIC_API_KEY for the AI Assistant

# Apply schema + RLS + RPCs
npx supabase db reset   # (or: npx supabase migration up, for an existing db)

# Seed the Mandi.com demo restaurant, tables, menu, and demo staff logins
npm run seed

npm run dev
```

Open http://localhost:3000 — it links to the customer menu (Table 5), kitchen,
staff, and owner dashboard.

### Demo logins (created by `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Owner | owner@mandi.com | mandi1234 |
| Chef | chef@mandi.com | mandi1234 |
| Staff | staff@mandi.com | mandi1234 |
| Super Admin | admin@mandi.com | mandi1234 |

## What's real vs. what's a placeholder

- **Prices**: the brief explicitly forbids guessing prices from the source
  menu. Every seeded dish has `base_price = null` ("Price on request") until
  set in `/owner/menu` — items can't be ordered until priced.
  Set them before running the end-to-end test below.
- **Dish videos**: no cinematic footage is bundled (this is a code
  deliverable, not a video shoot). The UI is built for the full
  video → poster → placeholder fallback chain either way — upload real
  MP4/WebM clips and poster images per dish in `/owner/menu` and they play
  immediately, autoplay-on-scroll, no code changes needed.
- **Reviews / restaurant history / address**: intentionally left out rather
  than fabricated, per the brief. `RestaurantStory`/reviews sections can be
  added once real content exists — the schema and pages don't currently
  invent placeholder testimonials.
- **Portion sizes** (Small/Medium/Large): fully supported end-to-end
  (`menu_item_portions` table, `DishModal` portion selector, price computed
  server-side per portion) but not yet exposed as an "Add portion" control in
  `/owner/menu` — the seeded menu didn't include a portion pricing table to
  preserve, so every seeded dish uses a single `base_price` instead. Add
  portions directly in the database (or extend `MenuManager`) for a dish
  that needs them; the customer-facing selector picks it up automatically.
- **Payments**: sandbox only (`is_sandbox = true` on every payment row),
  clearly labeled in the UI. Swap `rpc_record_sandbox_payment` for a real
  gateway webhook flow when ready to go live.

## End-to-end test (mirrors the product's own MVP loop)

1. `npm run seed`, then in `/owner/menu` set a price on a few dishes (e.g.
   Mandi Faham Chicken) and mark them Available.
2. Open `/r/mandi-com/table/5` on a phone (or a second browser window).
3. Add a dish, place the order.
4. Open `/kitchen` (sign in as chef@mandi.com) in another window — the order
   appears immediately via Realtime. Accept → Preparing → Ready.
5. Open `/staff` (staff@mandi.com) — mark it Served.
6. Back on the customer's `/order/[id]` page, the tracker has advanced live.
   Tap **Pay Now** → choose a method → sandbox payment succeeds → receipt.
7. Open `/owner` (owner@mandi.com) — revenue, order count, and table
   occupancy reflect the order you just placed. `/owner/analytics` and
   `/owner/ai` update from the same data.

## Project layout

```
supabase/migrations/   Schema, RLS, SECURITY DEFINER RPCs, storage policies
scripts/seed.ts         Demo restaurant/menu/tables/staff logins
src/app/                Routes (customer, /kitchen, /staff, /owner/*, /super-admin, /api/ai)
src/components/         customer/ kitchen/ staff/ owner/ shared/
src/lib/                supabase clients, cart store, data-access helpers
src/hooks/              realtime + intersection-observer hooks
```

## Build phases implemented

Phase 1 (customer QR → menu → video → cart → order), Phase 2 (kitchen +
staff realtime + customer requests), Phase 3 (billing + sandbox payment +
receipt), Phase 4 (owner dashboard + analytics), Phase 5 (AI insights +
assistant), and the multi-tenant/RLS/super-admin foundation for Phase 6 are
all implemented and build cleanly (`npm run build`). Phase 6's billing
plans/upgrade flows are intentionally minimal — the platform-admin view is
read-only for now.
