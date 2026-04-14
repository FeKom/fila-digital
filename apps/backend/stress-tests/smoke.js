import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:7070";

const TEST_USER = {
  name: "Smoke Test User",
  email: __ENV.TEST_EMAIL || "test@test.com",
  password: __ENV.TEST_PASSWORD || "12345678",
  phone: "+5511999990001",
};

export const options = {
  vus: 3,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Smoke test — validates that the API is alive and key endpoints respond.
// Run with: k6 run stress-tests/smoke.js
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

  check(loginRes, {
    "setup: login successful": (r) => r.status === 200,
  });

  const token = loginRes.json("token");
  if (!token) {
    console.warn("⚠ Login failed — authenticated endpoints will be skipped.");
  }

  return { token };
}

export default function (data) {
  // 1. Healthcheck (public, no auth)
  const health = http.get(`${BASE_URL}/healthcheck`);
  check(health, {
    "healthcheck returns 200": (r) => r.status === 200,
    "healthcheck is healthy": (r) => r.json("status") === "healthy",
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

  // 2. List commerces (authenticated)
  const commerces = http.get(`${BASE_URL}/commerce`, authHeaders);
  check(commerces, {
    "list commerces returns 200": (r) => r.status === 200,
  });

  sleep(1);
}
