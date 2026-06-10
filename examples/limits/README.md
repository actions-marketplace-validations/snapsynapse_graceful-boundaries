# Worked limits.json examples

Complete limits discovery responses for common service shapes. Copy the nearest match, edit the numbers, serve it at `/api/limits` or `/.well-known/limits`.

| File | Scenario | Shows |
|---|---|---|
| [saas-api.json](saas-api.json) | Multi-tenant SaaS API | key-rate, monthly quota, concurrency with queue depth |
| [free-scanner.json](free-scanner.json) | Free public scanner | ip-rate, resource-dedup with `returnsCached` |
| [llm-api.json](llm-api.json) | Token-metered LLM API | cost-limit with `costMetric: tokens`, monthly quota, burst-rate, change feed |
| [content-site.json](content-site.json) | Scraping-sensitive content site | ip-rate sized for reading not bulk retrieval, cooldown, licensing pointer |

All four validate against the published schema, enforced by `evals/test-schemas.js`:

```text
https://gracefulboundaries.dev/schema/limits.schema.json
```

Serve with `Cache-Control: public, s-maxage=300` or better, per the spec.
