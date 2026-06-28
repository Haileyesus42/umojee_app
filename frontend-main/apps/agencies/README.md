# apps/agencies

External-agencies dashboard for partner travel agencies booking on behalf of customers.

**Stack:** Vite + React + TypeScript + MUI + Radix (shares ~90% of code with `apps/admin`, separate brand/skin).

**Migrated from:** `umojaairways/booking/uxs` on 2026-05-20.

## Dev

```bash
cp .env.example .env.local
npm install
npm run dev                  # Vite — http://localhost:5174
```

## Build

```bash
npm run build
```

Static output in `dist/`.

## Note

Once we factor out shared code with `apps/admin` into `packages/ui`, this app will become a thin skin over the shared library.
