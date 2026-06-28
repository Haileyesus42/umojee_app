# Frontend architecture

Four independent apps, one repo. No shared runtime today. A `packages/` directory will hold shared code (UI library, types, utils) once the team agrees on a sharing strategy.

## App boundaries

- **booking** — public-facing, anonymous browsing → authenticated booking flow. SEO matters.
- **admin** — staff-only, role-gated. Internal LAN or VPN today.
- **agencies** — external partners, role-gated, audit-logged.
- **mobile** — same audience as booking, native UX. Currently iOS + Android via EAS.

Cross-cutting:
- All four hit `services/api` for REST.
- `booking` and `mobile` also call `services/ai-concierge` directly for the assistant.
- Auth: shared JWT issuer in `services/api`. Tokens propagate to `ai-concierge` for user context.

## Coming work

- Extract a `packages/ui` for shared components (MUI + Radix wrappers are duplicated across booking/admin/agencies).
- Adopt pnpm workspaces.
- Add Lighthouse CI to enforce perf budgets on `booking`.
