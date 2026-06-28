# apps/booking

Customer-facing flight booking site. Anonymous browse → authenticated checkout.

**Stack:** React (CRA) + MUI + Radix + LangChain SDK (for AI chat widget).

**Migrated from:** `umojaairways/booking/client` on 2026-05-20.

## Dev

```bash
cp .env.example .env.local    # fill values from Infisical / DevOps
npm install
npm start                     # or: npm run dev
```

Dev server defaults to http://localhost:3000.

## Build

```bash
npm run build
```

Static output in `build/`.
