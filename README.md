# ServiceHub — Service-Marketplace CRM

A portfolio CRM built around a service marketplace (Upwork-style). Three roles, a job board, and an AI layer.

- **Clients** post jobs, review applicants, award work, and track it.
- **Providers** browse the job board, submit proposals, and manage their pipeline.
- **Admins** oversee everything: analytics, moderation.

## Architecture

| Layer | Tech | Responsibility |
|-------|------|----------------|
| Frontend | Next.js | UI + talks to Supabase **directly** |
| Data / Auth | Supabase (Postgres) | Tables, Auth, and **RLS** that enforces the three portals |
| AI service | FastAPI + Anthropic | Match scoring, ranking, NL search/analytics, assistants |

The portal boundaries are enforced by Postgres **Row-Level Security**, not by an API layer — clients see only their jobs and applicants, providers see open jobs plus their own applications, admins see all.

## Repo layout

```
supabase/      # SQL migrations + seed data (schema, RLS, helper functions)
frontend/      # Next.js app (client/provider/admin portals)
ai-service/    # FastAPI microservice for Anthropic-powered features
```

## Getting started

See [supabase/README.md](supabase/README.md) for applying the schema, then `frontend/` and `ai-service/` for each service.
