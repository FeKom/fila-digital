import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:7070";

const TEST_USER = {
  name: "Stress Test User",
  email: "stress@filadigital.com",
  password: "stress12345",
  phone: "+5511999999999",
};

export const options = {
  vus: 3,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.05"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup — runs once before VUs start. Registers the test user and logs in.
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
    console.error("Setup failed: could not login. Tests will skip auth endpoints.");
  }

  return { token };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — each VU runs this in a loop for the configured duration.
// ─────────────────────────────────────────────────────────────────────────────

export default function (data) {
  // 1. Healthcheck (public)
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

  // 2. List commerces
  const commerces = http.get(`${BASE_URL}/commerce`, authHeaders);
  check(commerces, {
    "list commerces returns 200": (r) => r.status === 200,
  });

  // 3. User info
  const user = http.get(`${BASE_URL}/user`, authHeaders);
  check(user, {
    "user info returns 200": (r) => r.status === 200,
  });

  // 4. User commerces
  const userCommerces = http.get(`${BASE_URL}/user/commerces`, authHeaders);
  check(userCommerces, {
    "user commerces returns 200": (r) => r.status === 200,
  });

  sleep(1);
}
