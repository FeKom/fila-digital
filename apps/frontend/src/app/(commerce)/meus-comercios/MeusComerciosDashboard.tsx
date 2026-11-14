"use client";

import Link from "next/link";
import { Commerce, UserQueue } from "@/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CommerceCard from "@/domains/commerce/components/CommerceCard/CommerceCard";
import QueuePositionCard from "@/domains/queue/components/QueuePositionCard/QueuePositionCard";
import EmptyState from "@/components/EmptyState/EmptyState";

type Props = {
  commerces: Commerce[];
  queues: UserQueue[];
};

export function MeusComerciosDashboard({ commerces, queues }: Props) {
  const openQueues = queues.length;
  const openCommerces = commerces.filter(
    (c) => c.queue?.status === "open"
  ).length;

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="page-title">Minha área</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus comércios e acompanhe suas filas
        </p>

        {(commerces.length > 0 || queues.length > 0) && (
          <p className="mt-2 font-mono text-xs text-text-2">
            {commerces.length > 0 && (
              <>
                {commerces.length}{" "}
                {commerces.length === 1 ? "comércio" : "comércios"}
                {openCommerces > 0 &&
                  ` · ${openCommerces} aberto${openCommerces > 1 ? "s" : ""}`}
              </>
            )}
            {commerces.length > 0 && queues.length > 0 && " · "}
            {queues.length > 0 && (
              <>
                {openQueues} fila{openQueues !== 1 ? "s" : ""} ativa
                {openQueues !== 1 ? "s" : ""}
              </>
            )}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="comercios">
        <div className="mb-5 flex items-center justify-between">
          <TabsList variant="line">
            <TabsTrigger value="comercios">
              Comércios
              {commerces.length > 0 && (
                <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">
                  ({commerces.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="filas">
              Posições em fila
              {queues.length > 0 && (
                <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">
                  ({queues.length})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <Link
            href="/comercio/criar"
            className="fd-btn fd-btn-primary fd-btn-sm"
          >
            + Novo comércio
          </Link>
        </div>

        <TabsContent value="comercios">
          {commerces.length > 0 ? (
            <div className="dash-grid-2">
              {commerces.map((commerce) => (
                <CommerceCard key={commerce.id} commerce={commerce} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="Você ainda não tem comércios cadastrados."
              ctaLabel="Cadastrar comércio"
              ctaHref="/comercio/criar"
            />
          )}
        </TabsContent>

        <TabsContent value="filas">
          {queues.length > 0 ? (
            <div className="dash-grid-2">
              {queues.map((q) => (
                <QueuePositionCard key={q.queue_id} queue={q} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="Você não está aguardando em nenhuma fila no momento."
              ctaLabel="Procurar fila"
              ctaHref="/procurar-fila"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
