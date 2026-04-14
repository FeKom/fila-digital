import { logger } from "./logger";

/**
 * Circuit Breaker — database failure protection.
 *
 * States:
 *   CLOSED    — normal operation, every request passes through
 *   OPEN      — DB is failing, every request gets 503 immediately
 *   HALF_OPEN — cooldown elapsed, one probe request is allowed through
 *               to test whether the DB recovered
 *
 * Transitions:
 *   CLOSED  → OPEN      : `failureThreshold` consecutive 5xx responses
 *   OPEN    → HALF_OPEN : `resetTimeout` ms have elapsed
 *   HALF_OPEN → CLOSED  : `successThreshold` consecutive successes
 *   HALF_OPEN → OPEN    : any single failure
 *
 * Integration (src/server.ts):
 *   - onRequest hook  → calls `attempt()`; returns 503 when false
 *   - onSend hook     → calls `recordSuccess()` / `recordFailure()`
 *                       based on the HTTP status code of the response
 */

// ─────────────────────────────────────────────────────────────────────────────
// State enum
// ─────────────────────────────────────────────────────────────────────────────

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export interface CircuitBreakerConfig {
  /**
   * Number of consecutive 5xx responses that trip the circuit.
   * @default 5
   */
  failureThreshold: number;

  /**
   * Milliseconds to wait in OPEN state before moving to HALF_OPEN.
   * @default 30_000
   */
  resetTimeout: number;

  /**
   * Consecutive successes needed in HALF_OPEN to close the circuit again.
   * @default 2
   */
  successThreshold: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status snapshot (used by /healthcheck)
// ─────────────────────────────────────────────────────────────────────────────

export interface CircuitBreakerStatus {
  state: CircuitState;
  failures: number;
  successes: number;
  /**
   * ISO string of when the circuit will attempt HALF_OPEN.
   * Only present while in OPEN state.
   */
  nextAttemptAt: string | null;
  /**
   * How many milliseconds remain until the next probe attempt.
   * Only present while in OPEN state.
   */
  retryInMs: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CircuitBreaker
// ─────────────────────────────────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;

  /** Consecutive failures counted in CLOSED state. */
  private failures = 0;

  /** Consecutive successes counted in HALF_OPEN state. */
  private successes = 0;

  /**
   * Timestamp (ms) after which an OPEN circuit will attempt HALF_OPEN.
   * 0 means "not scheduled".
   */
  private nextAttemptAt = 0;

  /**
   * Whether the single HALF_OPEN probe slot is currently occupied.
   * While true, concurrent requests receive 503 until the probe resolves.
   */
  private halfOpenSlotTaken = false;

  private readonly config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeout: config?.resetTimeout ?? 30_000,
      successThreshold: config?.successThreshold ?? 2,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Called at the start of each request (onRequest hook).
   *
   * Returns `true` when the request should proceed normally.
   * Returns `false` when the circuit is OPEN or the HALF_OPEN slot is busy —
   * the caller should respond with 503 immediately.
   */
  attempt(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (Date.now() >= this.nextAttemptAt) {
          this.transitionTo(CircuitState.HALF_OPEN);
          // Fall through — take the probe slot below
        } else {
          return false; // still OPEN, reject
        }
      // eslint-disable-next-line no-fallthrough
      case CircuitState.HALF_OPEN:
        if (this.halfOpenSlotTaken) {
          // Another probe is already in flight — reject concurrent requests
          return false;
        }
        this.halfOpenSlotTaken = true;
        return true;
    }
  }

  /**
   * Called after a successful response (2xx / 3xx / 4xx) in the onSend hook.
   *
   * 4xx responses are client errors, not server/DB failures, so they count
   * as successes from the circuit breaker's perspective.
   */
  recordSuccess(): void {
    switch (this.state) {
      case CircuitState.CLOSED:
        // Reset consecutive failure counter on any success
        this.failures = 0;
        break;

      case CircuitState.HALF_OPEN:
        this.halfOpenSlotTaken = false;
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.transitionTo(CircuitState.CLOSED);
        }
        break;

      case CircuitState.OPEN:
        // Should not happen (attempt() blocks requests when OPEN),
        // but guard against race conditions.
        break;
    }
  }

  /**
   * Called after a 5xx response in the onSend hook.
   *
   * Increments the failure counter and opens the circuit when the threshold
   * is reached. In HALF_OPEN, any single failure immediately re-opens.
   */
  recordFailure(): void {
    switch (this.state) {
      case CircuitState.CLOSED:
        this.failures++;
        if (this.failures >= this.config.failureThreshold) {
          this.transitionTo(CircuitState.OPEN);
        }
        break;

      case CircuitState.HALF_OPEN:
        // Probe failed — DB is still down, go back to OPEN immediately
        this.transitionTo(CircuitState.OPEN);
        break;

      case CircuitState.OPEN:
        // Already open — nothing to do
        break;
    }
  }

  /**
   * Returns a snapshot of the current state for the /healthcheck endpoint.
   */
  get status(): CircuitBreakerStatus {
    const isOpen = this.state === CircuitState.OPEN;
    const retryInMs = isOpen
      ? Math.max(0, this.nextAttemptAt - Date.now())
      : null;

    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttemptAt: isOpen ? new Date(this.nextAttemptAt).toISOString() : null,
      retryInMs,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private transitionTo(next: CircuitState): void {
    const prev = this.state;
    this.state = next;

    switch (next) {
      case CircuitState.CLOSED:
        this.failures = 0;
        this.successes = 0;
        this.halfOpenSlotTaken = false;
        this.nextAttemptAt = 0;
        break;

      case CircuitState.OPEN:
        this.failures = 0;
        this.successes = 0;
        this.halfOpenSlotTaken = false;
        this.nextAttemptAt = Date.now() + this.config.resetTimeout;
        break;

      case CircuitState.HALF_OPEN:
        this.successes = 0;
        this.halfOpenSlotTaken = false;
        break;
    }

    // Log the transition — visible in Loki when running in production
    const msg = `[CircuitBreaker] ${prev} → ${next}`;
    if (next === CircuitState.OPEN) {
      logger.error(msg);
    } else {
      logger.info(msg);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton — one circuit breaker for the entire database connection pool.
// Imported by server.ts for the onRequest / onSend hooks.
// ─────────────────────────────────────────────────────────────────────────────

export const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30_000, // 30 seconds
  successThreshold: 2,
});
