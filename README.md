# Umoja Airways — Backend

Monorepo containing every backend service that powers Umoja Airways. Two services today; more can be added under `services/`.

> **Status:** Migrated from `umojaairways/booking/server` + `umojaairways/booking-ai` on 2026-05-20. Old repos archived. Pipeline still being hardened.

---

## Services

| Path | Service | Stack | Port | Purpose |
|---|---|---|---|---|
| `services/api` | **Main API** | Node 20 + TypeScript + Express-style | 3001 | REST API for booking, accounts, payments, ground-ops. MongoDB primary store. |
| `services/ai-concierge` | **AI Concierge** | Python 3.11 + FastAPI + LangGraph + Groq | 8000 | Conversational booking assistant; orchestrates Amadeus + knowledge agents. |

All apps in `umojaairways/frontend` consume these two.

---

## Quick start (local)

```bash
git clone git@gitlab.infralastic.com:umojaairways/backend.git
cd backend
docker compose up -d         # brings up Mongo + Redis + pgvector for AI
cp services/api/.env.example          services/api/.env
cp services/ai-concierge/.env.example services/ai-concierge/.env
# fill in values from Infisical (or ask DevOps)
```

Then in two terminals:

```bash
# Terminal 1 — main API
cd services/api && npm install && npm run dev

# Terminal 2 — AI concierge
cd services/ai-concierge && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server.main:app --reload --port 8000
```

---

## Project layout

```
backend/
├── services/
│   ├── api/                Node/TS REST API (was umojaairways/booking/server)
│   └── ai-concierge/       FastAPI + LangGraph (was umojaairways/booking-ai)
├── docker-compose.yml      local Mongo + Redis + pgvector for dev
├── docs/                   architecture, ADRs, runbooks
├── .gitignore
├── .gitlab-ci.yml          per-service lint + test + build
└── README.md               you are here
```

---

## Architecture (text view)

```
   Browsers + Mobile
         │
         ▼
   ┌────────────────────────────┐
   │ umojaairways/frontend apps │
   │  booking · admin · agencies · mobile │
   └─────────────┬──────────────┘
                 │ HTTPS
       ┌─────────┴─────────┐
       ▼                   ▼
  ┌──────────┐      ┌───────────────┐
  │ api      │◀────▶│ ai-concierge  │
  │ Node/TS  │      │ FastAPI       │
  │ :3001    │      │ + LangGraph   │
  └────┬─────┘      │ :8000         │
       │            └────┬──────────┘
       ▼                 ▼
   ┌─────────┐    ┌───────────────┐
   │ MongoDB │    │ pgvector +    │
   │         │    │ Redis + Groq  │
   └─────────┘    └───────────────┘
```

---

## Environment variables

**Never commit `.env` files.** They are gitignored and will be rejected by future pre-commit checks.

Each service has an `.env.example` listing required keys (no values). Workflow:

1. **Local dev:** copy `.env.example` → `.env`, fill in values.
2. **Staging / production:** values come from GitLab CI/CD variables today; migrating to **Infisical** next sprint.

Secrets that were in old committed `.env` files have been rotated.

---

## Conventions (the deck rules)

- `main` is protected, branch off it.
- MRs draft on day one, one reviewer minimum, no self-approval.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Each service has its own `Dockerfile`. CI builds and (will) scan images with Trivy.

---

## CI/CD

`.gitlab-ci.yml` runs per-service:

- **lint** (`npm run lint` / `ruff check`)
- **test** (`npm test` / `pytest`)
- **build** (`npm run build`)

Coming soon (commented out, enable when services are live):
- **SonarQube** code quality + security scan
- **Trivy** container image scan
- Container build + push to GitLab Container Registry, then deploy

---

## Onboarding (day-one checklist for new devs)

1. GitLab access via NDIT Microsoft SSO at https://gitlab.infralastic.com.
2. Clone this repo, `docker compose up -d`, get services running.
3. Pick an issue, branch, push a draft MR within the first hour.
4. The deployed URL (CI's review app, coming soon) is the demo.

Help: `#engineering` in Slack, or ping `@devops`.
