# Umoja Airways — Frontend

Monorepo containing every client-facing app at Umoja Airways. One repo, four apps, one consistent dev experience.

> **Status:** Migrated from `umojaairways/booking` subdirs on 2026-05-20. Old repos archived. Pipeline + workspaces still being hardened - see open issues.

---

## Apps

| Path | App | Stack | Purpose |
|---|---|---|---|
| `apps/booking` | **Booking site** | React (CRA) + MUI + Radix | Customer-facing flight booking and account management. |
| `apps/admin` | **Admin dashboard** | React + Vite + TS + MUI | Internal staff dashboard for operations, ground crew, support. |
| `apps/agencies` | **Agencies dashboard** | React + Vite + TS | Portal for external travel agencies booking on behalf of customers. |
| `apps/mobile` | **Mobile app (Umojee)** | React Native + Expo SDK 54 | Customer mobile app (iOS + Android), built with EAS. |

All four apps consume the same backend (`umojaairways/backend`).

---

## Quick start

```bash
# Clone
git clone git@gitlab.infralastic.com:umojaairways/frontend.git
cd frontend

# Pick an app and run
cd apps/booking      # or admin, agencies, mobile
cp .env.example .env.local      # then fill in values from Infisical or ask DevOps
npm install
npm run dev
```

Each app is self-contained for now (own `package.json`, own `node_modules`). A future MR will migrate to pnpm workspaces.

---

## Project layout

```
frontend/
├── apps/
│   ├── booking/      customer booking site (React + CRA)
│   ├── admin/        internal admin dashboard (Vite + React)
│   ├── agencies/     external-agencies dashboard (Vite + React)
│   └── mobile/       Expo / React Native (Umojee)
├── docs/             architecture, ADRs, runbooks
├── .gitignore
├── .gitlab-ci.yml    lint + test + build per app
└── README.md         you are here
```

---

## Environment variables

**Never commit `.env` files.** They are in `.gitignore` and will be rejected by future pre-commit checks.

Each app has an `.env.example` listing required keys (no values). Workflow:

1. **Local dev:** copy `.env.example` to `.env.local`, fill in values yourself (ask DevOps if missing).
2. **Staging / production:** values come from GitLab CI/CD variables today; migrating to **Infisical** (self-hosted secret manager) next sprint. Once Infisical is live, you'll get web-UI access to rotate secrets per environment.

Secrets that were in old committed `.env` files have been rotated. If anyone still has the old values cached locally, replace them.

---

## Conventions (the deck rules)

- **Branches:** `main` is protected. Branch off main, name `feature/<issue-id>-<short-desc>` or `fix/<issue-id>-<short-desc>`.
- **MRs:** open as draft on day one. Push your branch within hour one. No self-approval.
- **Reviewers:** `CODEOWNERS` (coming soon) routes the right reviewer.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- **One reviewer minimum.** Two for changes to shared `packages/` (once we add them).

---

## CI/CD

The pipeline (`.gitlab-ci.yml`) currently runs:

- **lint** per app (`npm run lint`)
- **build** per app (`npm run build`)

Coming soon (commented out, enable when services are live):
- **SonarQube** code quality + security scan
- **Trivy** container image scan
- **Lighthouse CI** perf budget gates for the web apps

---

## Onboarding (day-one checklist for new devs)

1. Get GitLab access from DevOps; sign in at https://gitlab.infralastic.com via NDIT Microsoft SSO.
2. Clone this repo (SSH key or HTTPS+PAT).
3. Pick an app, copy `.env.example` → `.env.local`, ask DevOps for current secret values.
4. `npm install && npm run dev` - confirm it boots locally.
5. Find a "good first issue" label in GitLab; branch, push (draft MR), get reviewed, merge.
6. **The MR is the demo.** No localhost screen-shares (see the deck).

Help: `#engineering` in Slack, or ping `@devops` on GitLab.
