import { Participant } from "@/types";

type ParticipantListProps = {
  participants: Participant[];
};

const ParticipantList = ({ participants }: ParticipantListProps) => {
  if (participants.length === 0) {
    return (
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--text-2)",
          textAlign: "center",
          padding: "2rem 0",
        }}
      >
        Nenhum participante na fila.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="fd-table">
        <thead>
          <tr>
            <th style={{ width: "80px" }}>Posição</th>
            <th>Identificação</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                  }}
                >
                  #{participant.position}
                </span>
              </td>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: participant.user_id
                        ? "var(--primary)"
                        : "var(--text-3)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: "var(--text-2)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {participant.user_id
                      ? (participant.person_name ??
                        `Usuário: ${participant.user_id.slice(0, 8)}...`)
                      : `Anônimo: ${participant.anonymous_id?.slice(0, 8) ?? "?"}...`}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantList;
