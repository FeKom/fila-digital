"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createQueue,
  createQueueSchedule,
} from "@/domains/queue/queue.actions";

type Props = {
  commerceId: string;
  commerceOpenAt?: string;
};

type ScheduleType = "none" | "once" | "daily";

export default function CreateQueueForm({ commerceId, commerceOpenAt }: Props) {
  const router = useRouter();
  const [scheduleType, setScheduleType] = useState<ScheduleType>("none");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const queue = await createQueue(commerceId, formData);

    if (!queue?.id) {
      setError("Erro ao criar fila. Tente novamente.");
      setLoading(false);
      return;
    }

    if (scheduleType !== "none") {
      const schedResult = await createQueueSchedule(commerceId, queue.id, {
        type: scheduleType,
        scheduled_at: scheduleType === "once" ? scheduledAt : undefined,
      });
      if (schedResult?.error) {
        setError(schedResult.error);
        setLoading(false);
        return;
      }
    }

    router.push(`/comercio/${commerceId}/dashboard`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="form-section-title">Informações da fila</div>
        <div className="fd-field" style={{ marginBottom: "1rem" }}>
          <label className="fd-label" htmlFor="name">
            Nome da Fila
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Fila Principal"
            className="fd-input"
          />
        </div>
        <div className="fd-field">
          <label className="fd-label" htmlFor="description">
            Descrição
          </label>
          <input
            id="description"
            name="description"
            type="text"
            placeholder="Descreva a fila"
            className="fd-input"
          />
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Configurações</div>
        <div className="form-grid-2">
          <div className="fd-field">
            <label className="fd-label" htmlFor="type">
              Tipo
            </label>
            <select
              id="type"
              name="type"
              defaultValue="permanent"
              className="fd-select"
            >
              <option value="permanent">Permanente</option>
              <option value="ephemera">Temporária</option>
            </select>
          </div>
          <div className="fd-field">
            <label className="fd-label" htmlFor="status">
              Status inicial
            </label>
            <select
              id="status"
              name="status"
              defaultValue="closed"
              className="fd-select"
            >
              <option value="open">Aberta</option>
              <option value="closed">Fechada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">Agendamento de abertura</div>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-3)",
            marginBottom: "0.75rem",
          }}
        >
          Configure quando a fila deve abrir automaticamente.
        </p>
        <div className="fd-field" style={{ marginBottom: "0.75rem" }}>
          <label className="fd-label">Tipo de agendamento</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["none", "once", "daily"] as ScheduleType[]).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`fd-btn fd-btn-sm ${scheduleType === opt ? "fd-btn-primary" : "fd-btn-ghost"}`}
                onClick={() => setScheduleType(opt)}
              >
                {opt === "none" && "Sem agendamento"}
                {opt === "once" && "Uma vez"}
                {opt === "daily" && "Todo dia"}
              </button>
            ))}
          </div>
        </div>

        {scheduleType === "once" && (
          <div className="fd-field">
            <label className="fd-label" htmlFor="scheduled_at">
              Data e hora de abertura
            </label>
            <input
              id="scheduled_at"
              type="datetime-local"
              className="fd-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>
        )}

        {scheduleType === "daily" && (
          <div
            style={{
              background: "var(--bg-muted)",
              borderRadius: "8px",
              padding: "0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-2)",
            }}
          >
            A fila abrirá automaticamente todos os dias no horário de abertura
            do comércio
            {commerceOpenAt ? ` (${commerceOpenAt})` : ""}.
          </div>
        )}
      </div>

      {error && <div className="fd-alert-error">{error}</div>}

      <div className="form-actions">
        <button
          type="submit"
          className="fd-btn fd-btn-primary"
          disabled={loading}
        >
          {loading ? "Criando..." : "Criar Fila"}
        </button>
      </div>
    </form>
  );
}
