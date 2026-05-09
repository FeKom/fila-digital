import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce } from "@/domains/commerce/commerce.actions";
import { Badge } from "@/components/Badge";

type Props = {
  params: Promise<{ commerce_id: string }>;
};

const CommercePublicPage = async ({ params }: Props) => {
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
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="page-title">{commerce.name}</h1>
        {commerce.description && (
          <p className="page-subtitle">{commerce.description}</p>
        )}
      </div>

      {/* Info card */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {(commerce.open_at || commerce.closed_at) && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
              Horário:
            </span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-1)" }}>
              {commerce.open_at} — {commerce.closed_at}
            </span>
          </div>
        )}

        {commerce.phone && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
              Telefone:
            </span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-1)" }}>
              {commerce.phone}
            </span>
          </div>
        )}

        {addressLine && (
          <div
            style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-3)",
                whiteSpace: "nowrap",
              }}
            >
              Endereço:
            </span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-1)" }}>
              {addressLine}
            </span>
          </div>
        )}
      </div>

      {/* Queue status + join */}
      {queue && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-3)",
              }}
            >
              Fila
            </span>
            <Badge variant={queue.status === "open" ? "success" : "error"}>
              {queue.status === "open" ? "Aberta" : "Fechada"}
            </Badge>
          </div>

          {queue.name && (
            <p
              style={{ fontSize: "0.9rem", color: "var(--text-2)", margin: 0 }}
            >
              {queue.name}
            </p>
          )}

          {queue.status === "open" ? (
            <Link
              href={`/entrar-fila?commerceId=${commerce_id}&mode=search`}
              className="fd-btn fd-btn-primary"
              style={{ textAlign: "center" }}
            >
              Entrar na fila
            </Link>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "var(--text-3)" }}>
              A fila está fechada no momento.
            </p>
          )}
        </div>
      )}

      {!queue && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--text-3)" }}>
            Este comércio não tem uma fila ativa.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommercePublicPage;
