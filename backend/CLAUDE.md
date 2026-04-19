# Backend — Sankofa

Express 5 + Prisma 7 + Postgres, TypeScript, ESM. See root `CLAUDE.md` for project context.

## Layout

```
src/
├── index.ts                         Express bootstrap, health route
├── routes/                          Mount points per resource
├── controllers/
│   └── webhook.controller.ts        Inbound signals from banks/MMOs
├── services/
│   ├── camara.ts                    All 7 CAMARA API calls (Nokia sandbox)
│   └── ai.ts                        Agentic decision engine → confidence score
└── generated/prisma/                Prisma client (custom output path)

prisma/
└── schema.prisma                    Postgres datasource
```

## Module resolution gotchas

- `"type": "module"` — **imports must include `.js` extension** even for `.ts` source.
- Prisma client is generated to `src/generated/prisma` (non-default). Import as:
  ```ts
  import { PrismaClient } from './generated/prisma/index.js';
  ```
- Do not move the generated directory without updating `schema.prisma`'s `output` field.

## What goes where

- **`services/camara.ts`** — wraps the official `network-as-code` TypeScript SDK. One function per CAMARA endpoint, typed in/out, no business logic. Auth via `NAC_TOKEN` (Nokia application key) + optional `NAC_ENV` (`dev` / `staging` / prod). Sandbox test numbers: `+99999991000` reports a swap, `+99999991001` doesn't. Device objects are cached per-phone inside the module to avoid re-fetching on each call in a pipeline run.
  - **Note: `network-as-code@7.0.0` on npm ships a broken tarball (no `dist/`). Pin to `^6.0.0` until Nokia republishes.**
- **`services/ai.ts`** — takes a theft event + user context, returns `{ score: 0-1, reasoning: string, tier: 'low'|'medium'|'high' }`. Reasoning is shown on the admin dashboard — keep it human-readable.
- **`controllers/webhook.controller.ts`** — both **inbound** (sale-initiation pings from MNO stores) and **outbound** (freeze signals to mock bank). One file is fine for the demo.

## Data model (planned, not built)

Minimum viable entities for the Kemi demo:
- `User` — phone number, home area polygon, trusted contacts
- `Device` — IMEI, current SIM, last-known location, blacklist status
- `TheftEvent` — trigger type, AI score, reasoning, tier, resolution
- `ActivityLog` — for the dashboard timeline

Keep it tight. Every field must earn its place by appearing in the demo.

## Dev

```bash
npm run dev        # from root, or `npm run dev` here
npm run db:push    # push schema to Postgres
npm run db:studio  # Prisma Studio
```
