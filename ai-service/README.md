# ServiceHub AI service

A FastAPI microservice that powers the AI features. It is **stateless** — the
Next.js app fetches data under RLS and passes exactly what's needed in each
request; this service only calls Anthropic and returns structured JSON. No
database access, no service keys here.

## Design

- **Structured output via forced tool use** — every endpoint forces Claude to
  call a single tool whose `input_schema` is the response shape, so responses
  are always valid JSON (no parsing/repair).
- **Model selection** — cheap/structured tasks (match score, search parsing) use
  **Haiku 4.5**; nuanced reasoning (ranking, analytics, assistants) uses
  **Sonnet 4.6**. Override with `MODEL_FAST` / `MODEL_SMART`.
- **Prompt caching** — each feature's system prompt is a stable, cache-control'd
  block; volatile request data goes last in the user turn.

## Endpoints

| Method/Path | Feature | Model |
|---|---|---|
| `POST /ai/match-score` | 0–100 fit score + one-line rationale | Haiku |
| `POST /ai/rank-applicants` | rank applicants with per-applicant summaries | Sonnet |
| `POST /ai/shortlist-explainer` | top picks + how they differ | Sonnet |
| `POST /ai/search/parse` | NL query → structured filters | Haiku |
| `POST /ai/analytics` | answer an admin question from aggregated data | Sonnet |
| `POST /ai/profile-gaps` | provider profile improvement suggestions | Sonnet |
| `POST /ai/job-assistant` | rough brief → polished job posting | Sonnet |
| `GET  /health` | liveness + config check | — |

Interactive docs at `http://localhost:8000/docs` once running.

## Run

```powershell
cd ai-service
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env   # then set ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

The frontend points at this via `NEXT_PUBLIC_AI_SERVICE_URL` (default
`http://localhost:8000`).

## Example

```bash
curl -s http://localhost:8000/ai/match-score -H "content-type: application/json" -d '{
  "job": {"title": "Next.js dashboard", "description": "Charts + filters", "budget_type": "fixed", "budget_min": 4000, "budget_max": 7000},
  "provider": {"display_name": "Maya", "headline": "Full-stack React + FastAPI", "skills": ["React","Next.js","TypeScript"], "hourly_rate": 85}
}'
# → {"score": 88, "rationale": "Strong React/Next.js overlap with the dashboard work and a realistic rate."}
```
