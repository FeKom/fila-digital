"use client";

import Link from "next/link";
import { Commerce, UserQueue } from "@/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CommerceCard from "@/domains/commerce/components/CommerceCard/CommerceCard";
import QueuePositionCard from "@/domains/queue/components/QueuePositionCard/QueuePositionCard";
import EmptyState from "@/components/EmptyState/EmptyState";
import { Store, ListOrdered } from "lucide-react";

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
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="page-title">Minha área</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus comércios e acompanhe suas filas
        </p>

        {/* Quick stats */}
        {(commerces.length > 0 || queues.length > 0) && (
          <div className="flex items-center gap-3 mt-3">
            {commerces.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                <Store size={11} />
                <span>
                  {commerces.length}{" "}
                  {commerces.length === 1 ? "comércio" : "comércios"}
                </span>
                {openCommerces > 0 && (
                  <span className="text-success font-medium">
                    · {openCommerces} aberto{openCommerces > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
            {queues.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                <ListOrdered size={11} />
                <span>
                  {openQueues} fila{openQueues !== 1 ? "s" : ""} ativa
                  {openQueues !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="comercios">
        <div className="flex items-center justify-between mb-5">
          <TabsList variant="line">
            <TabsTrigger value="comercios">
              Comércios
              {commerces.length > 0 && (
                <span className="ml-1.5 text-[10px] tabular-nums bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {commerces.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="filas">
              Posições em fila
              {queues.length > 0 && (
                <span className="ml-1.5 text-[10px] tabular-nums bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                  {queues.length}
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
              {queues.map((queue) => (
                <QueuePositionCard key={queue.queue_id} queue={queue} />
              ))}
            </div>
          ) : (
            <EmptyState
              message="Você não está em nenhuma fila no momento."
              ctaLabel="Entrar em uma fila"
              ctaHref="/entrar-fila"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
