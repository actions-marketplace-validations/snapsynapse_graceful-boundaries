# Graceful Boundaries for Express

Drop-in middleware. Level 2 conformance out of the box; Level 4 with `proactiveHeaders: true`.

## Install

Copy [graceful-boundaries.js](graceful-boundaries.js) into your project. No dependencies.

## Wire it up

```js
const express = require("express");
const { gracefulBoundaries } = require("./graceful-boundaries");

const app = express();

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
      humanUrl: "https://example.com/contact",
    },
  },
});

app.get("/api/limits", gb.limitsEndpoint);
app.get("/api/search", gb.protect("search"), (req, res) => {
  res.json({ results: [] });
});
```

## Structured non-429 refusals

```js
app.get("/api/result", (req, res) => {
  const result = store.get(req.query.id);
  if (!result) {
    return gb.refuse(res, 404, {
      error: "result_not_found",
      detail: `No result exists for ${req.query.id}. It may have expired.`,
      why: "Results are kept for 30 days after creation.",
      scanAvailable: true,
      scanUrl: `/api/search?q=${encodeURIComponent(req.query.id)}`,
    });
  }
  res.json(result);
});
```

## Verify

```bash
npx graceful-boundaries check http://localhost:3000
```

## Production notes

- Counters are in-memory and per-process. Behind a load balancer, back `take()` with a shared store (Redis `INCR` with `EXPIRE` is the usual swap).
- Set `trust proxy` in Express if you are behind a reverse proxy, so `req.ip` reflects the caller.
- Validate your bodies against the published schemas: https://gracefulboundaries.dev/schema/
