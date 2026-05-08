"use client";

import { useActionState } from "react";
import { updateProfile, deleteAccount } from "@/domains/user/user.actions";
import { User } from "@/types";

type Props = { user: User };

const initialState = { error: null };

export default function ProfileForm({ user }: Props) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    async (_prev: { error?: string }): Promise<{ error?: string }> => {
      const confirmed = window.confirm(
        "Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita."
      );
      if (!confirmed) return {};
      return deleteAccount() ?? {};
    },
    {} as { error?: string }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Edit form */}
      <form
        action={action}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div className="fd-field">
          <label className="fd-label" htmlFor="name">
            Nome
          </label>
          <input
            id="name"
            name="name"
            className="fd-input"
            defaultValue={user.name}
            required
          />
        </div>

        <div className="fd-field">
          <label className="fd-label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            className="fd-input"
            value={user.email}
            disabled
            style={{ opacity: 0.5, cursor: "not-allowed" }}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
            O e-mail não pode ser alterado.
          </span>
        </div>

        <div className="fd-field">
          <label className="fd-label" htmlFor="phone">
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            className="fd-input"
            defaultValue={user.phone}
            placeholder="+5511999999999"
          />
        </div>

        {state.error && <div className="fd-alert-error">{state.error}</div>}

        {state.error === null && !pending && (
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
            Perfil atualizado com sucesso!
          </div>
        )}

        <button
          type="submit"
          className="fd-btn fd-btn-primary"
          disabled={pending}
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      {/* Danger zone */}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--error)",
            margin: 0,
          }}
        >
          Zona de risco
        </p>
        {deleteState.error && (
          <div className="fd-alert-error">{deleteState.error}</div>
        )}
        <form action={deleteAction}>
          <button
            type="submit"
            className="fd-btn fd-btn-danger fd-btn-sm"
            disabled={deletePending}
          >
            {deletePending ? "Excluindo..." : "Excluir conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
