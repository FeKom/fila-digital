import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce } from "@/domains/commerce/commerce.actions";
import { Badge } from "@/components/Badge";
import { QueueStanchions } from "@/domains/queue/components/QueueStanchions";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CommercePublicPage = async ({
  params,
}: Props): Promise<React.ReactElement> => {
  const { commerce_id } = await params;
  const commerce = await getCommerce(commerce_id);

  if (!commerce) notFound();

  const queue = commerce.queue;
  const address = commerce.address;

  const addressLine = [
    address?.street && address?.number
      ? `${address.street}, ${address.number}`
      : address?.street,
    address?.complement,
    address?.neighborhood,
    address?.city && address?.state
      ? `${address.city} — ${address.state}`
      : address?.city,
    address?.cep,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="page-container-sm">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">{commerce.name}</h1>
        {commerce.description && (
          <p className="page-subtitle">{commerce.description}</p>
        )}
      </div>

      {/* Info card */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-bg-surface p-6">
        {(commerce.open_at || commerce.closed_at) && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-3">Horário:</span>
            <span className="text-sm text-text-1">
              {commerce.open_at} — {commerce.closed_at}
            </span>
          </div>
        )}

        {commerce.phone && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text-3">Telefone:</span>
            <span className="text-sm text-text-1">{commerce.phone}</span>
          </div>
        )}

        {addressLine && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-xs font-medium text-text-3">
              Endereço:
            </span>
            <span className="text-sm text-text-1">{addressLine}</span>
          </div>
        )}
      </div>

      {/* Queue status + join */}
      {queue ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-surface p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-text-3 uppercase">
              Fila de atendimento
            </span>
            <Badge variant={queue.status === "open" ? "success" : "error"}>
              {queue.status === "open" ? "Aberta" : "Fechada"}
            </Badge>
          </div>

          {queue.name && (
            <p className="m-0 text-sm font-medium text-text-2">{queue.name}</p>
          )}

          {queue.status === "open" ? (
            <>
              <QueueStanchions position={1} status="waiting" />
              <Link
                href={`/entrar-fila?commerceId=${commerce_id}&mode=search`}
                className="fd-btn fd-btn-primary text-center"
              >
                Entrar na fila
              </Link>
            </>
          ) : (
            <p className="text-sm text-text-3">
              A fila está fechada no momento.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-surface p-6 text-center">
          <p className="text-sm text-text-3">
            Este comércio não tem uma fila ativa.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommercePublicPage;
