"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Commerce } from "@/types";
import { useAnonymousId } from "@/lib/useAnonymousId";
import {
  enterDirect,
  enterViaToken,
  exitQueueAnon,
} from "@/domains/queue/queue.actions";
import {
  QueueStanchions,
  type QueueAttendanceStatus,
} from "@/domains/queue/components/QueueStanchions";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

type SSEFrame =
  | { position: number; queue_id: string }
  | { event: "exited" | "called" | "ready"; queue_id: string };

type Props = {
  commerce: Commerce & { catalog_url?: string | null };
  token?: string;
  mode?: string;
};

export default function EnterQueueView({
  commerce,
  token,
  mode,
}: Props): React.ReactElement {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [position, setPosition] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] =
    useState<QueueAttendanceStatus>("waiting");
  const [error, setError] = useState<string | null>(null);
  const anonymousId = useAnonymousId();
  const [exitState, setExitState] = useState<"idle" | "loading">("idle");

  const queue = commerce.queue;
  const usesToken =
    mode === "qrcode" || mode === "magic-link" || (!mode && !!token);

  // Live SSE updates once inside the queue
  useEffect(() => {
    if (state !== "done" || !anonymousId) return;

    const url = new URL(
      `/v1/participants-queue/${commerce.id}/stream`,
      BASE_URL
    );
    url.searchParams.set("anonymous_id", anonymousId);

    const es = new EventSource(url.toString(), { withCredentials: true });

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as SSEFrame;
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
        // Ignore malformed SSE frame
      }
    };

    return () => es.close();
  }, [state, anonymousId, commerce.id]);

  const handleEnter = async (): Promise<void> => {
    if (!queue) return;
    setState("loading");
    setError(null);

    const result =
      usesToken && token
        ? await enterViaToken(queue.id, token, anonymousId)
        : await enterDirect(commerce.id, queue.id, anonymousId);

    if (result.error) {
      setError(result.error);
      setState("error");
    } else {
      setPosition(result.position ?? 1);
      setAttendanceStatus("waiting");
      setState("done");
    }
  };

  if (state === "done") {
    const catalogHref = commerce.catalog_url ?? `/comercio/${commerce.id}`;

    return (
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-bg-surface p-6 shadow-xl">
        {/* Header + state switcher pill */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wider text-text-3 uppercase">
              {commerce.name}
            </p>
            <h2 className="font-display text-xl font-black text-text-1">
              {attendanceStatus === "waiting" && "Você está na fila"}
              {attendanceStatus === "called" && "Sua vez chegou!"}
              {attendanceStatus === "ready" && "Seu pedido está pronto!"}
            </h2>
          </div>

          <Badge
            variant={
              attendanceStatus === "waiting"
                ? "primary"
                : attendanceStatus === "called"
                  ? "warning"
                  : "success"
            }
          >
            {attendanceStatus === "waiting" && "Aguardando"}
            {attendanceStatus === "called" && "Chamado no balcão"}
            {attendanceStatus === "ready" && "Pronto p/ retirada"}
          </Badge>
        </div>

        {/* Velvet rope stanchions visualization */}
        <QueueStanchions position={position} status={attendanceStatus} />

        {/* Dynamic status banner */}
        {attendanceStatus === "waiting" && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated/60 px-4 py-3">
            <div>
              <span className="block text-xs font-semibold tracking-wider text-text-3 uppercase">
                Sua posição atual
              </span>
              <span className="text-sm text-text-2">
                Estimativa: ~{(position ?? 1) * 5} min de espera
              </span>
            </div>
            <span className="font-display text-4xl font-black text-primary tabular-nums">
              #{position ?? 1}
            </span>
          </div>
        )}

        {attendanceStatus === "called" && (
          <div
            role="status"
            className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-4 text-left"
          >
            <p className="font-display text-base font-bold text-accent">
              Sua vez chegou!
            </p>
            <p className="mt-1 text-sm text-text-1">
              O cordão abriu para você. Dirija-se ao atendimento de{" "}
              <strong>{commerce.name}</strong> para realizar ou confirmar seu
              pedido.
            </p>
          </div>
        )}

        {attendanceStatus === "ready" && (
          <div
            role="status"
            className="rounded-xl border border-success/40 bg-success/10 px-4 py-4 text-left"
          >
            <p className="font-display text-base font-bold text-success">
              Seu pedido está pronto!
            </p>
            <p className="mt-1 text-sm text-text-1">
              Dirija-se ao ponto de entrega de <strong>{commerce.name}</strong>{" "}
              para retirar seu pedido.
            </p>
          </div>
        )}

        {/* Catalog / Menu routing card */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-text-1">
              Cardápio e catálogo digital
            </p>
            <p className="text-xs text-text-2">
              Adiante sua escolha enquanto acompanha sua vez na fila.
            </p>
          </div>
          <Link
            href={catalogHref}
            target={commerce.catalog_url ? "_blank" : undefined}
            rel={commerce.catalog_url ? "noopener noreferrer" : undefined}
            className="fd-btn fd-btn-primary fd-btn-sm shrink-0 text-center"
          >
            Ver cardápio
          </Link>
        </div>

        {/* Interactive preview controls + exit button */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-3">Etapa:</span>
            <button
              type="button"
              onClick={() => setAttendanceStatus("waiting")}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
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
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
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
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                attendanceStatus === "ready"
                  ? "bg-success/20 text-success"
                  : "text-text-3 hover:text-text-1"
              }`}
            >
              Pedido pronto
            </button>
          </div>

          <Button
            intent="danger"
            size="sm"
            disabled={exitState === "loading"}
            onClick={async () => {
              setExitState("loading");
              await exitQueueAnon(commerce.id, anonymousId);
              setState("idle");
              setPosition(null);
              setAttendanceStatus("waiting");
              setExitState("idle");
            }}
          >
            {exitState === "loading" ? "Saindo..." : "Sair da fila"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-bg-surface p-8">
      <div>
        <h1 className="page-title">{commerce.name}</h1>
        {commerce.description && (
          <p className="page-subtitle">{commerce.description}</p>
        )}
      </div>

      {(commerce.open_at || commerce.closed_at) && (
        <p className="text-sm text-text-3">
          Horário: {commerce.open_at} — {commerce.closed_at}
        </p>
      )}

      {queue ? (
        <>
          <div className="flex items-center gap-2">
            <Badge variant={queue.status === "open" ? "success" : "error"}>
              Fila {queue.status === "open" ? "aberta" : "fechada"}
            </Badge>
            {queue.name && (
              <span className="text-xs text-text-3">{queue.name}</span>
            )}
          </div>

          {queue.status !== "open" ? (
            <p className="text-sm text-text-3">
              A fila está fechada no momento.
            </p>
          ) : (
            <>
              {error && <div className="fd-alert-error">{error}</div>}
              <Button
                intent="primary"
                onClick={handleEnter}
                disabled={state === "loading" || !anonymousId}
                className="w-full"
              >
                {state === "loading" ? "Entrando..." : "Entrar na fila"}
              </Button>
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-text-3">
          Este comércio não tem uma fila ativa.
        </p>
      )}
    </div>
  );
}
