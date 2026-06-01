# Supabase — schema, RLS, and seed

This folder is the source of truth for the database. The three-portal boundary
(client / provider / admin) is enforced by **Row-Level Security**, not by an API
layer.

## Migrations

| File | What it does |
|------|--------------|
| `0001_schema.sql` | Enums, core tables, helper functions, triggers (auto-profile on signup, `updated_at`) |
| `0002_rls.sql` | RLS policies — the portal boundaries |
| `0003_categories.sql` | Category reference data |
| `0004_timeline_payments_files.sql` | Job-status timeline, escrow milestones, attachments, notifications + realtime + auto-event/notification triggers |
| `0005_storage.sql` | Private `attachments` Storage bucket + storage policies |

## Applying

### Option A — Supabase CLI (recommended)

```bash
# from repo root
npx supabase login                      # opens browser for an access token
npx supabase link --project-ref <ref>   # <ref> from your project URL / dashboard
npx supabase db push                     # applies everything in migrations/ in order
```

### Option B — Dashboard SQL editor

Open the SQL editor in your Supabase project and run each file in
`migrations/` **in numeric order** (0001 → 0005).

## Seeding demo data

The seed creates demo auth users via the Admin API (handles password hashing +
email confirmation) and a rich, interconnected dataset.

```bash
# needs the SERVICE ROLE key (Settings → API), not the anon key
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
npm install            # installs @supabase/supabase-js (see package.json)
node supabase/seed.mjs
```

Demo accounts (password `ServiceHub!2026`):

| Role | Email |
|------|-------|
| admin | `admin@servicehub.test` |
| client | `acme@servicehub.test`, `nordic@servicehub.test` |
| provider | `maya@servicehub.test`, `devon@servicehub.test`, `sam@servicehub.test`, `lena@servicehub.test` |

> On Windows PowerShell use `$env:SUPABASE_URL = "..."` instead of `export`.

## Notes

- **Realtime**: `messages`, `notifications`, `applications`, and `job_events`
  are added to the `supabase_realtime` publication, so the frontend can subscribe
  to live inserts.
- **Timeline + notifications populate themselves**: `SECURITY DEFINER` triggers
  write `job_events` on every status change and `notifications` when an
  application is filed, its status changes, or a message is sent.
- **Storage**: the `attachments` bucket is private; the app mints signed URLs for
  authorized downloads.
