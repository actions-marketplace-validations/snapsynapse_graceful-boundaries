# Graceful Boundaries for FastAPI

Drop-in helper class. Level 2 conformance out of the box; Level 4 with `proactive_headers=True`.

## Install

Copy [graceful_boundaries.py](graceful_boundaries.py) into your project. No dependencies beyond FastAPI.

## Wire it up

```python
from fastapi import FastAPI, Request
from graceful_boundaries import GracefulBoundaries

app = FastAPI()
gb = GracefulBoundaries(
    service="My API",
    description="What this service does.",
    conformance="level-2",
    limits={
        "search": {
            "endpoint": "/api/search",
            "method": "GET",
            "limits": [{
                "type": "ip-rate",
                "maxRequests": 60,
                "windowSeconds": 3600,
                "description": "60 searches per IP per hour.",
            }],
            "why": "Rate limits keep this free service available for everyone.",
        },
    },
)

@app.get("/api/limits")
def limits():
    return gb.limits_response()

@app.get("/api/search")
def search(request: Request):
    refusal = gb.check("search", request)
    if refusal:
        return refusal
    return {"results": []}
```

## Structured non-429 refusals

```python
@app.get("/api/result")
def result(id: str):
    item = store.get(id)
    if item is None:
        return GracefulBoundaries.refuse(404, {
            "error": "result_not_found",
            "detail": f"No result exists for {id}. It may have expired.",
            "why": "Results are kept for 30 days after creation.",
        })
    return item
```

## Verify

```bash
npx graceful-boundaries check http://localhost:8000
```

## Production notes

- Counters are in-memory and per-process. With multiple workers (uvicorn `--workers`, gunicorn) back `_take` with a shared store such as Redis.
- Behind a reverse proxy, configure forwarded-IP handling so `request.client.host` reflects the caller.
- Validate your bodies against the published schemas: https://gracefulboundaries.dev/schema/
