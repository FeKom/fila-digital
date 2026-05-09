"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CommerceAdmin } from "@/types";
import { grantAdmin, revokeAdmin } from "@/domains/commerce/commerce.actions";

type Props = {
  commerceId: string;
  initialAdmins: CommerceAdmin[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminsCard({ commerceId, initialAdmins }: Props) {
  const router = useRouter();
  const [admins, setAdmins] = useState<CommerceAdmin[]>(initialAdmins);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleGrant = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const result = await grantAdmin(commerceId, email.trim());
    if (result.error) {
      setError(result.error);
    } else {
      setEmail("");
      showSuccess("Acesso concedido!");
      router.refresh();
    }
    setLoading(false);
  };

  const handleRevoke = async (personId: string, name: string) => {
    setRevoking(personId);
    setError(null);
    const result = await revokeAdmin(commerceId, personId);
    if (result.error) {
      setError(result.error);
    } else {
      setAdmins((prev) => prev.filter((a) => a.person_id !== personId));
      showSuccess(`Acesso de ${name} removido`);
      router.refresh();
    }
    setRevoking(null);
  };

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          margin: 0,
        }}
      >
        Administradores
      </p>

      {/* Grant form */}
      <form
        onSubmit={handleGrant}
        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
      >
        <input
          type="email"
          className="fd-input"
          placeholder="E-mail do usuário"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          style={{ flex: 1, fontSize: "0.85rem" }}
        />
        <button
          type="submit"
          className="fd-btn fd-btn-primary fd-btn-sm"
          disabled={loading || !email.trim()}
        >
          {loading ? "..." : "Adicionar"}
        </button>
      </form>

      {/* Admin list */}
      {admins.length === 0 ? (
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--text-3)",
            margin: 0,
            textAlign: "center",
            padding: "0.5rem 0",
          }}
        >
          Nenhum administrador cadastrado.
        </p>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {admins.map((admin) => (
            <div
              key={admin.person_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0.75rem",
                background: "var(--bg-base)",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                gap: "0.75rem",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "var(--text-1)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {admin.name}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    color: "var(--text-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {admin.email}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.7rem",
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Admin desde {formatDate(admin.created_at)}
                </p>
              </div>
              <button
                className="fd-btn fd-btn-sm"
                style={{
                  flexShrink: 0,
                  background: "transparent",
                  border: "1px solid var(--error)",
                  color: "var(--error)",
                  fontSize: "0.75rem",
                }}
                disabled={revoking === admin.person_id}
                onClick={() => handleRevoke(admin.person_id, admin.name)}
              >
                {revoking === admin.person_id ? "..." : "Remover"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="fd-alert-error" style={{ fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: "var(--success-bg)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            fontSize: "0.85rem",
            color: "var(--success)",
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
}
