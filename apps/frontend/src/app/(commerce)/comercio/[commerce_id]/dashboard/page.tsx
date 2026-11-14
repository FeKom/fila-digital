import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getCommerce,
  deleteCommerce,
  listAdmins,
} from "@/domains/commerce/commerce.actions";
import {
  getParticipants,
  getQueueSchedule,
} from "@/domains/queue/queue.actions";
import { Badge } from "@/components/Badge";
import { ParticipantList } from "@/domains/queue/components/ParticipantList";
import { Button } from "@/components";
import QueueShareCard from "../QueueShareCard";
import QueueManageCard from "../QueueManageCard";
import AdminsCard from "../AdminsCard";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CommerceDashboard = async ({
  params,
}: Props): Promise<React.ReactElement> => {
  const { commerce_id } = await params;
  const [commerce, participants, admins] = await Promise.all([
    getCommerce(commerce_id),
    getParticipants(commerce_id),
    listAdmins(commerce_id),
  ]);

  if (!commerce) notFound();

  const cookieStore = await cookies();
  const jwt = cookieStore.get("digital_queue_jwt")?.value;
  const currentUserId = jwt
    ? (
        JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()) as {
          id?: string;
        }
      ).id
    : undefined;

  const isOwner = currentUserId === commerce.owner_id;
  const isAdmin = admins.some((a) => a.person_id === currentUserId);
  if (!isOwner && !isAdmin) {
    redirect(`/comercio/${commerce_id}`);
  }

  const schedule = commerce.queue
    ? await getQueueSchedule(commerce_id, commerce.queue.id)
    : null;

  const deleteAction = async (): Promise<void> => {
    "use server";
    await deleteCommerce(commerce_id);
  };

  const queue = commerce.queue;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{commerce.name}</h1>
          {commerce.description && (
            <p className="page-subtitle">{commerce.description}</p>
          )}
        </div>
        <div className="page-header-actions">
          <Link
            href={`/comercio/${commerce_id}/editar`}
            className="fd-btn fd-btn-ghost fd-btn-sm"
          >
            Editar
          </Link>
          {isOwner && (
            <form action={deleteAction}>
              <Button type="submit" intent="error" size="sm">
                Excluir
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Editorial Metadata Strip */}
      <dl className="section-gap grid grid-cols-1 gap-4 border-y border-border py-4 sm:grid-cols-3 sm:divide-x sm:divide-border">
        <div>
          <dt className="font-mono text-xs font-semibold tracking-wider text-text-3 uppercase">
            Telefone
          </dt>
          <dd className="mt-1 text-sm font-medium text-text-1">
            {commerce.phone ?? "—"}
          </dd>
        </div>
        <div className="sm:pl-5">
          <dt className="font-mono text-xs font-semibold tracking-wider text-text-3 uppercase">
            CNPJ
          </dt>
          <dd className="mt-1 text-sm font-medium text-text-1">Cadastrado</dd>
        </div>
        <div className="sm:pl-5">
          <dt className="font-mono text-xs font-semibold tracking-wider text-text-3 uppercase">
            Horário
          </dt>
          <dd className="mt-1 text-sm font-medium text-text-1">
            {commerce.open_at && commerce.closed_at
              ? `${commerce.open_at} — ${commerce.closed_at}`
              : "—"}
          </dd>
        </div>
      </dl>

      {/* Admins section */}
      <div className="mt-6">
        <span className="section-label">Administradores</span>
        <div className="mt-3">
          <AdminsCard commerceId={commerce_id} initialAdmins={admins} />
        </div>
      </div>

      {/* Queue section */}
      <div className="queue-section">
        <div className="section-header">
          <div className="queue-section-label-group">
            <span className="section-label m-0">Fila</span>
            {queue && (
              <Badge variant={queue.status === "open" ? "success" : "error"}>
                {queue.status === "open" ? "Aberta" : "Fechada"}
              </Badge>
            )}
          </div>
          <div className="page-header-actions">
            {queue ? (
              <Link
                href={`/comercio/${commerce_id}/fila/${queue.id}/editar`}
                className="fd-btn fd-btn-ghost fd-btn-sm"
              >
                Editar Fila
              </Link>
            ) : (
              <Link
                href={`/comercio/${commerce_id}/fila/criar`}
                className="fd-btn fd-btn-primary fd-btn-sm"
              >
                Criar Fila
              </Link>
            )}
          </div>
        </div>

        {queue ? (
          <>
            {/* Two-card layout: Share | Manage */}
            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <QueueShareCard commerceId={commerce_id} queue={queue} />
              <QueueManageCard
                commerce={commerce}
                participantCount={participants.length}
                schedule={schedule}
              />
            </div>

            {/* Participant list */}
            <div className="mt-6">
              <span className="section-label">Participantes na fila</span>
              <ParticipantList participants={participants} />
            </div>
          </>
        ) : (
          <p className="queue-empty-msg">
            Este comércio ainda não tem uma fila.
          </p>
        )}
      </div>
    </div>
  );
};

export default CommerceDashboard;
