import { Participant } from "@/types";

type ParticipantListProps = {
  participants: Participant[];
};

const ParticipantList = ({ participants }: ParticipantListProps) => {
  if (participants.length === 0) {
    return (
      <p className="text-gray-500 text-center py-6">
        Nenhum participante na fila.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Posicao</th>
            <th>Identificacao</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td className="font-bold text-lg">#{participant.position}</td>
              <td>
                {participant.user_id
                  ? `Usuario: ${participant.user_id.slice(0, 8)}...`
                  : `Anonimo: ${participant.anonymous_id?.slice(0, 8)}...`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantList;
