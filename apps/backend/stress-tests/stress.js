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

// O access token vive 15 minutos. Sob saturacao o teste leva bem mais que isso
// de relogio, entao o token do setup() expira no meio e todo o resto vira 401 —
// o teste passaria a medir expiracao de JWT em vez de capacidade.
//
// Estado por VU (cada VU do k6 tem seu proprio isolate, entao isto nao e
// compartilhado): renova de forma proativa antes de expirar, e reativa se
// mesmo assim vier um 401.
const TOKEN_TTL_MS = 15 * 60 * 1000;
const RENEW_BEFORE_MS = 5 * 60 * 1000; // renova aos 10min de vida
let vuToken = null;
let vuTokenAt = 0;

// IP unico por VU — cada VU ganha seu proprio balde de rate limit.
function vuIp() {
  return `10.0.${Math.floor(__VU / 255)}.${__VU % 255}`;
}

function doLogin() {
  const res = http.post(
    `${BASE_URL}/v1/user/login`,
    JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password }),
    {
      headers: { "Content-Type": "application/json", "X-Forwarded-For": vuIp() },
      responseCallback: http.expectedStatuses(200, 429),
    },
  );
  return res.status === 200 ? res.json("access_token") : null;
}

function tokenFor(data) {
  const idade = Date.now() - vuTokenAt;
  if (!vuToken || idade > TOKEN_TTL_MS - RENEW_BEFORE_MS) {
    const novo = vuToken ? doLogin() : data.token;
    if (novo) {
      vuToken = novo;
      vuTokenAt = Date.now();
    }
  }
  return vuToken;
}

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
  const token = tokenFor(data);
  const authHeaders = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Forwarded-For": vuIp(),
    },
  };

  // 2. Mix of read operations (most common in production)
  const commerces = http.get(`${BASE_URL}/v1/commerce`, { ...authHeaders, responseCallback: expectedResponses });

  // Fallback: token invalidado antes do previsto — renova e tenta na proxima
  // iteracao, em vez de queimar a iteracao inteira em 401.
  if (commerces.status === 401) {
    const novo = doLogin();
    if (novo) {
      vuToken = novo;
      vuTokenAt = Date.now();
    }
    sleep(0.5);
    return;
  }

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
