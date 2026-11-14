"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { exitQueue } from "@/domains/queue/queue.actions";
import { getAnonymousId } from "@/lib/anonymousId";
import { subscribeToPush, isPushSupported, isIOS } from "@/lib/push";
import {
  QueueStanchions,
  type QueueAttendanceStatus,
} from "@/domains/queue/components/QueueStanchions";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import type { UserQueue } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

type SSEMessage =
  | { position: number; queue_id: string }
  | { event: "exited" | "called" | "ready"; queue_id: string };

const noopSubscribe = (): (() => void) => () => {};

const QueueItem = ({
  queue: initialQueue,
}: {
  queue: UserQueue & { catalog_url?: string | null };
}): React.ReactElement => {
  const [position, setPosition] = useState(initialQueue.position);
  const [attendanceStatus, setAttendanceStatus] =
    useState<QueueAttendanceStatus>("waiting");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pushSupported = useSyncExternalStore(
    noopSubscribe,
    isPushSupported,
    () => false
  );
  const [pushState, setPushState] = useState<"idle" | "subscribed">("idle");

  // Live position & status via SSE
  useEffect(() => {
    const anonId = getAnonymousId();
    const url = new URL(
      `/v1/participants-queue/${initialQueue.commerce_id}/stream`,
      BASE_URL
    );
    url.searchParams.set("anonymous_id", anonId);

    const es = new EventSource(url.toString(), { withCredentials: true });

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as SSEMessage;
        if ("position" in data) {
          setPosition(data.position);
          setAttendanceStatus("waiting");
        }
        if ("event" in data) {
          if (data.event === "ready") {
            setAttendanceStatus("ready");
          } else {
            setAttendanceStatus("called");
            setPosition(1);
          }
          es.close();
        }
      } catch {
        // Ignore malformed frame
      }
    };

    return () => es.close();
  }, [initialQueue.commerce_id]);

  useEffect(() => {
    if (!pushSupported) return;

    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setPushState("subscribed");
      })
    );
  }, [pushSupported]);

  const handlePushSubscribe = async (): Promise<void> => {
    const anonId = getAnonymousId();
    const ok = await subscribeToPush(anonId);
    if (ok) setPushState("subscribed");
  };

  const estimatedMinutes = position * 5;

  const handleExit = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const result = await exitQueue(initialQueue.commerce_id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const catalogHref =
    initialQueue.catalog_url ?? `/comercio/${initialQueue.commerce_id}`;

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-bg-surface p-6">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-text-3 uppercase">
            {initialQueue.commerce_name}
          </p>
          <h2 className="font-display text-lg font-bold text-text-1">
            {initialQueue.queue_name}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              attendanceStatus === "waiting"
                ? "primary"
                : attendanceStatus === "called"
                  ? "warning"
                  : "success"
            }
          >
            {attendanceStatus === "waiting" &&
              `#${position} • ~${estimatedMinutes} min`}
            {attendanceStatus === "called" && "Sua vez chegou!"}
            {attendanceStatus === "ready" && "Pedido pronto!"}
          </Badge>
        </div>
      </div>

      {/* Velvet rope stanchions visualization */}
      <QueueStanchions position={position} status={attendanceStatus} />

      {/* Status banner when called or order ready */}
      {attendanceStatus === "called" && (
        <div
          role="status"
          className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
        >
          <p className="font-display text-sm font-bold text-accent">
            Sua vez chegou!
          </p>
          <p className="mt-0.5 text-xs text-text-1">
            Dirija-se ao atendimento de{" "}
            <strong>{initialQueue.commerce_name}</strong>.
          </p>
        </div>
      )}

      {attendanceStatus === "ready" && (
        <div
          role="status"
          className="rounded-xl border border-success/40 bg-success/10 px-4 py-3"
        >
          <p className="font-display text-sm font-bold text-success">
            Seu pedido está pronto!
          </p>
          <p className="mt-0.5 text-xs text-text-1">
            Retire seu pedido no balcão de{" "}
            <strong>{initialQueue.commerce_name}</strong>.
          </p>
        </div>
      )}

      {/* Catalog / Menu routing & Push notifications */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-1">
            Catálogo / Cardápio
          </p>
          <p className="text-xs text-text-2">
            Consulte os itens de {initialQueue.commerce_name} antes do
            atendimento.
          </p>
        </div>
        <Link
          href={catalogHref}
          className="fd-btn fd-btn-primary fd-btn-sm shrink-0"
        >
          Ver cardápio
        </Link>
      </div>

      {/* Push notification + stage preview + exit */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {pushSupported && pushState === "idle" && (
            <button
              type="button"
              onClick={handlePushSubscribe}
              className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
            >
              Ativar alerta de vez
            </button>
          )}
          {pushState === "subscribed" && (
            <span className="text-xs font-medium text-success">
              Notificações ativas
            </span>
          )}
          {isIOS() && pushState !== "subscribed" && (
            <span className="text-xs text-text-3">
              No iOS, adicione à Tela de Início para receber alertas.
            </span>
          )}

          {/* Stage switcher */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAttendanceStatus("waiting")}
              className={`rounded px-2 py-1 text-xs transition ${
                attendanceStatus === "waiting"
                  ? "bg-primary/20 text-primary"
                  : "text-text-3 hover:text-text-1"
              }`}
            >
              Na fila
            </button>
            <button
              type="button"
              onClick={() => setAttendanceStatus("called")}
              className={`rounded px-2 py-1 text-xs transition ${
                attendanceStatus === "called"
                  ? "bg-accent/20 text-accent"
                  : "text-text-3 hover:text-text-1"
              }`}
            >
              Sua vez chegou
            </button>
            <button
              type="button"
              onClick={() => setAttendanceStatus("ready")}
              className={`rounded px-2 py-1 text-xs transition ${
                attendanceStatus === "ready"
                  ? "bg-success/20 text-success"
                  : "text-text-3 hover:text-text-1"
              }`}
            >
              Pedido pronto
            </button>
          </div>
        </div>

        <Button
          type="button"
          intent="danger"
          size="sm"
          onClick={handleExit}
          disabled={loading}
        >
          {loading ? "Saindo..." : "Sair"}
        </Button>
      </div>

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
};

export default QueueItem;
