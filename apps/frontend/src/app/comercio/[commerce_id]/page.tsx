import Link from "next/link";
import {
  getCommerce,
  getParticipants,
  deleteCommerce,
  callNextParticipant,
} from "./actions";
import { Badge } from "@/components/Badge";
import { ParticipantList } from "@/components/ParticipantList";
import { Button } from "@/components";
import { CopyLinkButton } from "@/components/CopyLinkButton";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CommerceDetail = async ({ params }: Props) => {
  const { commerce_id } = await params;
  const [commerce, participants] = await Promise.all([
    getCommerce(commerce_id),
    getParticipants(commerce_id),
  ]);

  const deleteAction = async () => {
    "use server";
    await deleteCommerce(commerce_id);
  };

  const callNextAction = async () => {
    "use server";
    await callNextParticipant(commerce_id);
  };

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{commerce.name}</h1>
          {commerce.description && (
            <p className="page-subtitle">{commerce.description}</p>
          )}
        </div>
        <div className="page-header-actions">
          {commerce.queue?.status === "open" && (
            <CopyLinkButton commerceId={commerce_id} />
          )}
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

      {/* Stats row */}
      <div className="dash-grid-3 section-gap">
        <div className="stat-card">
          <div className="stat-label">Telefone</div>
          <div className="stat-value">{commerce.phone}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CNPJ</div>
          <div className="stat-value">Cadastrado ✓</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Horário</div>
          <div className="stat-value">
            {commerce.open_at} — {commerce.closed_at}
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
            {commerce.queue && (
              <Badge
                variant={commerce.queue.status === "open" ? "success" : "error"}
              >
                {commerce.queue.status === "open" ? "Aberta" : "Fechada"}
              </Badge>
            )}
          </div>
          <div className="page-header-actions">
            {commerce.queue ? (
              <Link
                href={`/comercio/${commerce_id}/fila/${commerce.queue.id}/editar`}
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

        {commerce.queue ? (
          <>
            <div className="queue-actions-row">
              <form action={callNextAction}>
                <Button type="submit" intent="secondary" size="sm">
                  Chamar Próximo
                </Button>
              </form>
              <span className="queue-participants-count">
                {participants.length}{" "}
                {participants.length === 1 ? "participante" : "participantes"}{" "}
                na fila
              </span>
            </div>
            <ParticipantList participants={participants} />
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
