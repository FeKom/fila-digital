import React from "react";
import { Participant } from "@/types";

type ParticipantListProps = {
  participants: Participant[];
};

const ParticipantList = ({
  participants,
}: ParticipantListProps): React.ReactElement => {
  if (participants.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-2">
        Nenhum participante na fila.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="fd-table">
        <thead>
          <tr>
            <th className="w-20">Posição</th>
            <th>Identificação</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td>
                <span className="font-mono text-lg font-bold text-primary">
                  #{participant.position}
                </span>
              </td>
              <td>
                <span className="font-mono text-xs text-text-2">
                  {participant.user_id
                    ? (participant.person_name ??
                      `[Conta] ${participant.user_id.slice(0, 8)}...`)
                    : `[Anônimo] ${participant.anonymous_id?.slice(0, 8) ?? "?"}...`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantList;
