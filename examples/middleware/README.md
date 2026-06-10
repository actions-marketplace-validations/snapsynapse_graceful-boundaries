# Middleware examples

Copy-paste implementations of Graceful Boundaries for common frameworks. Each is a single dependency-free file that delivers Level 2 conformance (structured 429 refusals + limits discovery endpoint) and reaches Level 4 when proactive headers are enabled.

| Framework | File | Runtime |
|---|---|---|
| Express | [express/](express/) | Node.js |
| FastAPI | [fastapi/](fastapi/) | Python |
| Cloudflare Workers | [workers/](workers/) | Workers |
| Hono | [hono/](hono/) | Workers, Node, Deno, Bun |

## What they share

- Config object mirrors the [limits discovery schema](https://gracefulboundaries.dev/schema/limits.schema.json): define limits once, serve them at `/api/limits`, enforce them on routes.
- 429 refusals carry all five Level 1 fields: `error`, `detail`, `limit`, `retryAfterSeconds`, `why`.
- A `refuse()` helper enforces the three core fields (`error`, `detail`, `why`) on every other error class.
- In-memory fixed-window counters by default; one function to swap for Redis or another shared store in production.

## What they deliberately leave out

- Authentication, key management, persistence — your stack decides those.
- Level 3 constructive guidance beyond the optional `alternativeEndpoint` / `upgradeUrl` / `humanUrl` pass-through fields, because cached-result URLs are application-specific.

## Verify your integration

```bash
npx graceful-boundaries check https://your-service.example
```

Achieving Level 1 and Level 3 requires observing a live refusal, which the passive checker cannot trigger; see [CONFORMANCE.md](../../CONFORMANCE.md).
