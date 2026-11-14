"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CommerceAdmin } from "@/types";
import { grantAdmin, revokeAdmin } from "@/domains/commerce/commerce.actions";
import { Button } from "@/components/Button";

type Props = {
  commerceId: string;
  initialAdmins: CommerceAdmin[];
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminsCard({
  commerceId,
  initialAdmins,
}: Props): React.ReactElement {
  const router = useRouter();
  const [admins, setAdmins] = useState<CommerceAdmin[]>(initialAdmins);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showSuccess = (msg: string): void => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleGrant = async (
    e: React.SyntheticEvent<HTMLFormElement>
  ): Promise<void> => {
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

  const handleRevoke = async (
    personId: string,
    name: string
  ): Promise<void> => {
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
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-bg-surface p-6">
      <p className="m-0 text-xs font-bold tracking-widest text-text-3 uppercase">
        Administradores
      </p>

      <form onSubmit={handleGrant} className="flex items-center gap-2">
        <input
          type="email"
          className="fd-input flex-1 text-sm"
          placeholder="E-mail do usuário"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <Button
          type="submit"
          intent="primary"
          size="sm"
          disabled={loading || !email.trim()}
        >
          {loading ? "..." : "Adicionar"}
        </Button>
      </form>

      {admins.length === 0 ? (
        <p className="m-0 py-2 text-center text-sm text-text-3">
          Nenhum administrador cadastrado.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {admins.map((admin) => (
            <div
              key={admin.person_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-page px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold text-text-1">
                  {admin.name}
                </p>
                <p className="m-0 truncate text-xs text-text-2">
                  {admin.email}
                </p>
                <p className="m-0 font-mono text-xs text-text-3">
                  Admin desde {formatDate(admin.created_at)}
                </p>
              </div>
              <Button
                type="button"
                intent="danger"
                size="sm"
                className="shrink-0"
                disabled={revoking === admin.person_id}
                onClick={() => handleRevoke(admin.person_id, admin.name)}
              >
                {revoking === admin.person_id ? "..." : "Remover"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {error && <div className="fd-alert-error text-sm">{error}</div>}
      {success && <p className="m-0 text-sm text-success">{success}</p>}
    </div>
  );
}
