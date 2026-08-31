# Telegram Business OS

An operations console for paid Telegram communities, covering member access, payment activity, bot queue health, workspace activity, and connection settings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional live service env: `WHOP_WEBHOOK_SECRET`, `WHOP_API_KEY`, `TELEGRAM_BOT_TOKEN`, `APP_URL`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/telegram-business-os` — React/Vite dashboard and route-level UI
- `artifacts/api-server` — Express API, seed data, webhook ingestion, and workspace operations
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `lib/db/src/schema/index.ts` — Drizzle schema for workspace, members, payments, activity, queue, settings, and outbox data
- `lib/api-client-react` / `lib/api-zod` — generated client hooks and server validators

## Architecture decisions

- The first-run experience uses the built-in PostgreSQL database and seeds a small workspace so the product is useful before live service connections are authorized.
- Webhook ingestion is opt-in: it rejects requests until `WHOP_WEBHOOK_SECRET` exists, verifies the raw request bytes, and deduplicates by an idempotency key.
- The UI reads through generated API hooks, while the server validates every query, body, and response against generated schemas.
- The dashboard is intentionally responsive and uses connection state from the server rather than presenting unconfigured live integrations as healthy.

## Product

- Overview with active members, revenue pulse, queue balance, recent activity, and system health
- Searchable/filterable member access records with status updates and access revocation
- Payment ledger with confirmed, pending, and refunded views
- Bot event queue with failed-event retry flow
- Workspace settings and observability activity feed

## User preferences

No project-specific preferences recorded.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`, then run the workspace typecheck.
- The API server seeds only when the database has no workspace rows; it will not overwrite existing development data.
- Live Whop webhook ingestion requires `WHOP_WEBHOOK_SECRET` to be added securely; never place secrets in source files.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
