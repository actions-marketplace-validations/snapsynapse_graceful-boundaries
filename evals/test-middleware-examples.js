#!/usr/bin/env node

/**
 * Graceful Boundaries middleware example tests.
 *
 * Exercises the Express example in examples/middleware/express/ with mock
 * req/res objects and validates its outputs against the shared checker
 * functions, so the published examples cannot drift from the spec.
 *
 * Usage: node evals/test-middleware-examples.js
 */

const { gracefulBoundaries } = require("../examples/middleware/express/graceful-boundaries.js");
const { checkRefusalBody, checkLimitsBody } = require("./check.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL  ${name}: ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function mockRes() {
  const res = {
    headers: {},
    statusCode: 200,
    body: null,
    set(key, value) {
      if (typeof key === "object") Object.assign(this.headers, key);
      else this.headers[key] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

function makeGb(overrides = {}) {
  return gracefulBoundaries({
    service: "Example API",
    description: "Test service.",
    conformance: "level-2",
    limits: {
      search: {
        endpoint: "/api/search",
        method: "GET",
        limits: [
          {
            type: "ip-rate",
            maxRequests: 2,
            windowSeconds: 60,
            description: "2 searches per IP per minute.",
          },
        ],
        why: "Keeps the test service available.",
        humanUrl: "https://example.com/contact",
      },
    },
    ...overrides,
  });
}

// ─── Discovery endpoint ──────────────────────────────────────────

test("Express limitsEndpoint emits a valid discovery body", () => {
  const gb = makeGb();
  const res = mockRes();
  gb.limitsEndpoint({}, res);
  const result = checkLimitsBody(res.body);
  assert(result.isValid, `discovery body invalid: ${JSON.stringify(result.problems || result)}`);
  assert(res.headers["Cache-Control"].includes("s-maxage"), "should set cacheable header");
});

// ─── Rate limiting and refusal shape ─────────────────────────────

test("Express protect allows requests under the limit", () => {
  const gb = makeGb();
  const handler = gb.protect("search");
  let nextCalled = false;
  handler({ ip: "1.2.3.4" }, mockRes(), () => { nextCalled = true; });
  assert(nextCalled, "first request should pass through");
});

test("Express protect returns a conformant 429 refusal over the limit", () => {
  const gb = makeGb();
  const handler = gb.protect("search");
  const req = { ip: "5.6.7.8" };
  handler(req, mockRes(), () => {});
  handler(req, mockRes(), () => {});
  const res = mockRes();
  let nextCalled = false;
  handler(req, res, () => { nextCalled = true; });
  assert(!nextCalled, "third request should be refused");
  assert(res.statusCode === 429, `expected 429, got ${res.statusCode}`);
  assert(res.headers["Retry-After"], "should set Retry-After header");
  const result = checkRefusalBody(res.body);
  assert(result.hasRequiredFields, `refusal missing required fields: ${JSON.stringify(res.body)}`);
  assert(result.hasConstructiveFields, "refusal should include the configured humanUrl");
});

test("Express refusals are isolated per caller", () => {
  const gb = makeGb();
  const handler = gb.protect("search");
  handler({ ip: "9.9.9.9" }, mockRes(), () => {});
  handler({ ip: "9.9.9.9" }, mockRes(), () => {});
  let nextCalled = false;
  handler({ ip: "8.8.8.8" }, mockRes(), () => { nextCalled = true; });
  assert(nextCalled, "different IP should not share the bucket");
});

// ─── Proactive headers (Level 4) ─────────────────────────────────

test("Express proactiveHeaders stamps RateLimit headers on success", () => {
  const gb = makeGb({ proactiveHeaders: true });
  const handler = gb.protect("search");
  const res = mockRes();
  handler({ ip: "2.2.2.2" }, res, () => {});
  assert(/limit=2, remaining=1, reset=\d+/.test(res.headers.RateLimit), `bad RateLimit header: ${res.headers.RateLimit}`);
  assert(res.headers["RateLimit-Policy"] === "2;w=60", `bad RateLimit-Policy: ${res.headers["RateLimit-Policy"]}`);
});

// ─── refuse() helper ─────────────────────────────────────────────

test("Express refuse() enforces core fields", () => {
  const gb = makeGb();
  let threw = false;
  try {
    gb.refuse(mockRes(), 404, { error: "not_found", detail: "Missing why." });
  } catch (e) {
    threw = true;
  }
  assert(threw, "refuse without why should throw");

  const res = mockRes();
  gb.refuse(res, 404, {
    error: "not_found",
    detail: "No such resource.",
    why: "Results expire after 30 days.",
  });
  assert(res.statusCode === 404, "should set status");
  assert(res.body.why, "should pass body through");
});

// ─── Summary ─────────────────────────────────────────────────────

console.log("");
console.log(`${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
