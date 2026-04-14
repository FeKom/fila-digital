import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:7070";

const TEST_USER = {
  name: "Load Test User",
  email: __ENV.TEST_EMAIL || "test@test.com",
  password: __ENV.TEST_PASSWORD || "12345678",
  phone: "+5511999990000",
};

// Tell k6 that 429 (rate-limited) is expected under load, not a real failure.
const expectedResponses = http.expectedStatuses(200, 429);

export const options = {
  stages: [
    { duration: "1m", target: 50 },  // ramp up
    { duration: "3m", target: 50 },  // sustain
    { duration: "1m", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],  // 95% of requests < 500ms
    http_req_failed: ["rate<0.01"],    // less than 1% real errors (429s excluded via expectedStatuses)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Load test — sustained traffic to validate performance under normal load.
// Run with: k6 run stress-tests/load.js
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const jsonHeaders = { headers: { "Content-Type": "application/json" } };

  // Register (ignore if user already exists)
  http.post(`${BASE_URL}/user/register`, JSON.stringify(TEST_USER), jsonHeaders);

  // Login
  const loginRes = http.post(
    `${BASE_URL}/user/login`,
    JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    jsonHeaders,
  );

  const token = loginRes.json("token");
  if (!token) {
    console.warn("⚠ Login failed — authenticated endpoints will be skipped.");
  }

  return { token };
}

export default function (data) {
  // 1. Healthcheck (public)
  const health = http.get(`${BASE_URL}/healthcheck`);
  check(health, {
    "healthcheck returns 200": (r) => r.status === 200,
  });

  if (!data.token) {
    sleep(1);
    return;
  }

  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.token}`,
    },
  };

  // 2. List commerces (read-heavy)
  const commerces = http.get(`${BASE_URL}/commerce`, { ...authHeaders, responseCallback: expectedResponses });
  check(commerces, {
    "list commerces returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  // 3. Get user info
  const user = http.get(`${BASE_URL}/user`, { ...authHeaders, responseCallback: expectedResponses });
  check(user, {
    "user info returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  // 4. List user commerces
  const userCommerces = http.get(`${BASE_URL}/user/commerces`, { ...authHeaders, responseCallback: expectedResponses });
  check(userCommerces, {
    "user commerces returns 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  sleep(1);
}
