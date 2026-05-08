import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getCommerce,
  deleteCommerce,
} from "@/domains/commerce/commerce.actions";
import { getParticipants } from "@/domains/queue/queue.actions";
import { Badge } from "@/components/Badge";
import { ParticipantList } from "@/domains/queue/components/ParticipantList";
import { Button } from "@/components";
import QueueShareCard from "./QueueShareCard";
import QueueManageCard from "./QueueManageCard";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CommerceDetail = async ({ params }: Props) => {
  const { commerce_id } = await params;
  const [commerce, participants] = await Promise.all([
    getCommerce(commerce_id),
    getParticipants(commerce_id),
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

  if (currentUserId !== commerce.owner_id) {
    redirect(`/entrar-fila?commerceId=${commerce_id}&mode=search`);
  }

  const deleteAction = async () => {
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
          <form action={deleteAction}>
            <Button type="submit" intent="error" size="sm">
              Excluir
            </Button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-grid-3 section-gap">
        <div className="stat-card">
          <div className="stat-label">Telefone</div>
          <div className="stat-value">{commerce.phone ?? "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CNPJ</div>
          <div className="stat-value">Cadastrado ✓</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Horário</div>
          <div className="stat-value">
            {commerce.open_at && commerce.closed_at
              ? `${commerce.open_at} — ${commerce.closed_at}`
              : "—"}
          </div>
        </div>
      </div>

      {/* Queue section */}
      <div className="queue-section">
        <div className="section-header">
          <div className="queue-section-label-group">
            <span className="section-label" style={{ margin: 0 }}>
              Fila
            </span>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
                marginTop: "0.5rem",
              }}
            >
              <QueueShareCard commerceId={commerce_id} queue={queue} />
              <QueueManageCard
                commerce={commerce}
                participantCount={participants.length}
              />
            </div>

            {/* Participant list */}
            <div style={{ marginTop: "1.5rem" }}>
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

export default CommerceDetail;
