# services/api

Main REST API for Umoja Airways.

**Stack:** Node 20 + TypeScript + Express-style (axios, body-parser, compression).

**Migrated from:** `umojaairways/booking/server` on 2026-05-20.

## Responsibilities

- Auth (JWT issuer)
- Booking CRUD
- Accounts + profiles
- Payments (Stripe)
- Email + notifications
- Ground-ops endpoints

## Dev

```bash
cp .env.example .env
npm install
npm run dev          # nodemon src/server.ts
```

Default port: **3001**.

## Build + start

```bash
npm run build        # tsc → dist/
npm start            # node dist/server.js
```

## DB operations

```bash
npm run export:db    # dump Mongo collections
npm run import:db    # restore Mongo collections
```

## Tests

```bash
npm test             # if test scripts exist; otherwise add them
```

## Container

```bash
docker build -t umoja-api .
docker run -p 3001:3001 --env-file .env umoja-api
```
