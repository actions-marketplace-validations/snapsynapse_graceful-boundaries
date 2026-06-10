# Graceful Boundaries for Hono

Drop-in middleware for Hono on Workers, Node, Deno, or Bun. Level 2 conformance out of the box; Level 4 with `proactiveHeaders: true`.

## Install

Copy [graceful-boundaries.js](graceful-boundaries.js) into your project. No dependencies.

## Wire it up

```js
import { Hono } from "hono";
import { gracefulBoundaries } from "./graceful-boundaries.js";

const gb = gracefulBoundaries({
  service: "My API",
  description: "What this service does.",
  conformance: "level-4",
  proactiveHeaders: true,
  limits: {
    search: {
      endpoint: "/api/search",
      method: "GET",
      limits: [{
        type: "ip-rate",
        maxRequests: 60,
        windowSeconds: 3600,
        description: "60 searches per IP per hour.",
      }],
      why: "Rate limits keep this free service available for everyone.",
    },
  },
});

const app = new Hono();
app.get("/api/limits", gb.limitsHandler);
app.get("/api/search", gb.protect("search"), (c) => c.json({ results: [] }));

export default app;
```

## Structured non-429 refusals

```js
app.get("/api/result", (c) => {
  const item = store.get(c.req.query("id"));
  if (!item) {
    return gb.refuse(c, 404, {
      error: "result_not_found",
      detail: "No result exists for that id. It may have expired.",
      why: "Results are kept for 30 days after creation.",
    });
  }
  return c.json(item);
});
```

## Verify

```bash
npx graceful-boundaries check http://localhost:8787
```

## Production notes

- Counters are in-memory: per-process on Node/Bun/Deno, per-isolate and per-colo on Workers. Back `take()` with Redis, KV + Durable Objects, or Cloudflare's Rate Limiting binding for real enforcement.
- Caller identity uses `CF-Connecting-IP` then the first `X-Forwarded-For` hop. Adjust to your proxy topology.
- Validate your bodies against the published schemas: https://gracefulboundaries.dev/schema/
