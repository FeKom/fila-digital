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
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
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
      <div className="dash-grid-3" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <div className="stat-label">Telefone</div>
          <div className="stat-value">{commerce.phone}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">CNPJ</div>
          <div className="stat-value">{commerce.document_id}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Horário</div>
          <div className="stat-value">
            {commerce.open_at} — {commerce.closed_at}
          </div>
        </div>
      </div>

      {/* Queue section */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <div className="section-header">
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                margin: "1rem 0",
              }}
            >
              <form action={callNextAction}>
                <Button type="submit" intent="secondary" size="sm">
                  Chamar Próximo
                </Button>
              </form>
              <span style={{ fontSize: "0.82rem", color: "var(--text-2)" }}>
                {participants.length} participante(s) na fila
              </span>
            </div>
            <ParticipantList participants={participants} />
          </>
        ) : (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-2)",
              textAlign: "center",
              padding: "2rem 0",
            }}
          >
            Este comércio ainda não tem uma fila.
          </p>
        )}
      </div>
    </div>
  );
};

export default CommerceDetail;
