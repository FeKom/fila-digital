import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:7070";

const TEST_USER = {
  name: "Stress Test User",
  email: __ENV.TEST_EMAIL || "stress2@filadigital.com",
  password: __ENV.TEST_PASSWORD || "Stress@test1!",
  phone: "+5511999990002",
};

// Tell k6 that 429 (rate-limited) is expected under stress, not a real failure.
const expectedResponses = http.expectedStatuses(200, 429);

export const options = {
  stages: [
    { duration: "1m", target: 50 },   // warm up
    { duration: "2m", target: 100 },  // ramp to normal load
    { duration: "2m", target: 200 },  // push beyond normal
    { duration: "2m", target: 300 },  // stress zone
    { duration: "1m", target: 400 },  // breaking point search
    { duration: "2m", target: 0 },    // recovery / ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // relaxed: 95% < 1s under stress
    http_req_failed: ["rate<0.05"],    // allow up to 5% real errors (429s excluded via expectedStatuses)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Stress test — pushes the API to its limits to find the breaking point.
// Run with: k6 run stress-tests/stress.js
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const jsonHeaders = { headers: { "Content-Type": "application/json" } };

  // Register — 409 is expected if user already exists from a previous run
  http.post(
    `${BASE_URL}/v1/user/register`,
    JSON.stringify(TEST_USER),
    { ...jsonHeaders, responseCallback: http.expectedStatuses(200, 201, 409) },
  );

  // Login
  const loginRes = http.post(
    `${BASE_URL}/v1/user/login`,
    JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    jsonHeaders,
  );

  check(loginRes, {
    "setup: login successful": (r) => r.status === 200,
  });

  const token = loginRes.json("access_token");
  if (!token) {
    console.warn("⚠ Login failed — authenticated endpoints will be skipped.");
  }

  return { token };
}

export default function (data) {
  if (!data.token) {
    sleep(0.5);
    return;
  }

  // Spoof a unique IP per VU so each VU has its own rate limit bucket.
  // Without this, all 400 VUs share one bucket (127.0.0.1) and the test
  // measures the rate limiter, not the backend.
  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.token}`,
      "X-Forwarded-For": `10.0.${Math.floor(__VU / 255)}.${__VU % 255}`,
    },
  };

  // 2. Mix of read operations (most common in production)
  const commerces = http.get(`${BASE_URL}/v1/commerce`, { ...authHeaders, responseCallback: expectedResponses });
  check(commerces, {
    "list commerces returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  const user = http.get(`${BASE_URL}/v1/user`, { ...authHeaders, responseCallback: expectedResponses });
  check(user, {
    "user info returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  const userCommerces = http.get(`${BASE_URL}/v1/user/commerces`, { ...authHeaders, responseCallback: expectedResponses });
  check(userCommerces, {
    "user commerces returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  const userQueues = http.get(`${BASE_URL}/v1/user/queues`, { ...authHeaders, responseCallback: expectedResponses });
  check(userQueues, {
    "user queues returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  sleep(0.5);
}
