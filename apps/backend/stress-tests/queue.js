import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:7070";

// Owner creates and manages the queue
const OWNER = {
  name: "Queue Owner",
  email: "queue-owner@filadigital.com",
  password: "Owner@test1!",
  phone: "+5511988880001",
};

// Participants enter and exit the queue
const makeParticipant = (n) => ({
  name: `Participant ${n}`,
  email: `participant-${n}@filadigital.com`,
  password: "Participant@1!",
  phone: `+551199777${String(n).padStart(4, "0")}`,
});

const PARTICIPANT_COUNT = 20;

const expectedAll = http.expectedStatuses(200, 201, 204, 400, 404, 409, 429);

export const options = {
  stages: [
    { duration: "30s", target: 20 },  // ramp up
    { duration: "2m",  target: 50 },  // sustain
    { duration: "30s", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed:   ["rate<0.05"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Setup — runs once. Creates owner, commerce, queue, and participant accounts.
// Returns: { ownerToken, commerceId, queueId, participantTokens[] }
// ─────────────────────────────────────────────────────────────────────────────

export function setup() {
  const json = { headers: { "Content-Type": "application/json" } };

  // 1. Register & login owner
  http.post(`${BASE_URL}/v1/user/register`, JSON.stringify(OWNER), {
    ...json,
    responseCallback: expectedAll,
  });

  const ownerLogin = http.post(
    `${BASE_URL}/v1/user/login`,
    JSON.stringify({ email: OWNER.email, password: OWNER.password }),
    json
  );

  check(ownerLogin, { "owner login ok": (r) => r.status === 200 });

  const ownerToken = ownerLogin.json("access_token");
  if (!ownerToken) {
    console.error("Owner login failed — aborting setup");
    return {};
  }

  const ownerAuth = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
  };

  // 2. Register commerce
  const commerceRes = http.post(
    `${BASE_URL}/v1/commerce/register`,
    JSON.stringify({
      name: "Stress Test Commerce",
      document_id: "11222333000181", // valid CNPJ format
      phone: "+5511988880001",
      address: "Rua Teste, 123",
    }),
    { ...ownerAuth, responseCallback: expectedAll }
  );

  const commerceId = commerceRes.json("commerce_id");
  if (!commerceId) {
    console.error(`Commerce registration failed: ${commerceRes.body}`);
    return {};
  }

  // 3. Register queue for that commerce
  const queueRes = http.post(
    `${BASE_URL}/v1/queue/register`,
    JSON.stringify({
      commerce_id: commerceId,
      name: "Stress Queue",
      max_size: 500,
    }),
    { ...ownerAuth, responseCallback: expectedAll }
  );

  const queueId = queueRes.json("queue_id");
  if (!queueId) {
    console.error(`Queue registration failed: ${queueRes.body}`);
    return {};
  }

  // 4. Register & login participants
  const participantTokens = [];
  for (let i = 1; i <= PARTICIPANT_COUNT; i++) {
    const p = makeParticipant(i);
    http.post(`${BASE_URL}/v1/user/register`, JSON.stringify(p), {
      ...json,
      responseCallback: expectedAll,
    });

    const loginRes = http.post(
      `${BASE_URL}/v1/user/login`,
      JSON.stringify({ email: p.email, password: p.password }),
      json
    );

    const token = loginRes.json("access_token");
    if (token) participantTokens.push(token);
  }

  console.log(
    `Setup complete — commerceId: ${commerceId}, queueId: ${queueId}, participants: ${participantTokens.length}`
  );

  return { ownerToken, commerceId, queueId, participantTokens };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main — simulates realistic queue traffic per VU:
//   odd VUs  → participants (enter queue, exit queue)
//   even VUs → owner operations (call next, call next N, list queue)
// ─────────────────────────────────────────────────────────────────────────────

export default function (data) {
  const { ownerToken, commerceId, queueId, participantTokens } = data;

  if (!ownerToken || !commerceId || !queueId || !participantTokens?.length) {
    sleep(1);
    return;
  }

  // Pick a participant token round-robin by VU index
  const participantToken =
    participantTokens[(__VU - 1) % participantTokens.length];

  // Spoof unique IP per VU so rate limiter doesn't collapse all VUs into one bucket
  const ip = `10.0.${Math.floor(__VU / 255)}.${__VU % 255}`;

  const participantAuth = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${participantToken}`,
      "X-Forwarded-For": ip,
    },
    responseCallback: expectedAll,
  };

  const ownerAuth = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
      "X-Forwarded-For": ip,
    },
    responseCallback: expectedAll,
  };

  if (__VU % 3 === 0) {
    // ── Owner: call next (remove first in queue) ──────────────────────────
    const next = http.del(
      `${BASE_URL}/v1/participants-queue/${commerceId}/next`,
      null,
      ownerAuth
    );
    check(next, {
      "call next: ok": (r) => [200, 204, 404, 429].includes(r.status),
    });

    // ── Owner: call next N ────────────────────────────────────────────────
    const nextN = http.del(
      `${BASE_URL}/v1/participants-queue/${commerceId}/next/3`,
      null,
      ownerAuth
    );
    check(nextN, {
      "call next N: ok": (r) => [200, 204, 404, 429].includes(r.status),
    });

    // ── Owner: list queue ─────────────────────────────────────────────────
    const list = http.get(
      `${BASE_URL}/v1/participants-queue/${commerceId}`,
      ownerAuth
    );
    check(list, {
      "list queue: ok": (r) => [200, 429].includes(r.status),
    });
  } else {
    // ── Participant: enter queue ──────────────────────────────────────────
    const enter = http.post(
      `${BASE_URL}/v1/participants-queue/enter/${commerceId}`,
      JSON.stringify({ queue_id: queueId }),
      participantAuth
    );
    check(enter, {
      "enter queue: ok": (r) => [200, 201, 400, 409, 429].includes(r.status),
    });

    sleep(0.5);

    // ── Participant: exit queue ───────────────────────────────────────────
    const exit = http.del(
      `${BASE_URL}/v1/participants-queue/${commerceId}/exit`,
      null,
      participantAuth
    );
    check(exit, {
      "exit queue: ok": (r) => [200, 204, 404, 429].includes(r.status),
    });
  }

  sleep(0.5);
}
