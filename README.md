# Telegram Business OS

Telegram Business OS is an operations console for paid Telegram communities. It gives operators a live view of member access, payment activity, bot queue health, recent workspace signals, and connection settings.

## Running locally

The web app and API server are managed by the project workflows. The first run seeds a small Creator Circle workspace so the dashboard is useful immediately.

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run dev
```

## API and data model

- The API contract lives in `lib/api-spec/openapi.yaml`.
- The dashboard uses the generated client in `lib/api-client-react`.
- Development data uses the built-in PostgreSQL database through Drizzle ORM.
- Signed Whop webhooks are accepted at `POST /api/webhooks/whop` and queued idempotently in `outbox_events`.
- `WHOP_WEBHOOK_SECRET` must be configured before webhook ingestion is enabled. Secrets are never stored in source code.

## Production connections

The preview works with seeded development data. To connect a real Whop company or Telegram bot, authorize those services in the project integrations and then add their runtime secrets through the secure environment settings. The UI intentionally reports connection state instead of pretending a service is live.