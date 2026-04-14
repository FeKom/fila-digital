import Link from "next/link";
import { Commerce } from "@/types";

type CommerceCardProps = {
  commerce: Commerce;
};

const CommerceCard = ({ commerce }: CommerceCardProps) => {
  return (
    <Link
      href={`/comercio/${commerce.id}`}
      className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow border border-base-200"
    >
      <div className="card-body p-5">
        <h3 className="card-title text-lg">{commerce.name}</h3>
        {commerce.description && (
          <p className="text-sm text-gray-500 line-clamp-2">
            {commerce.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
          <span>
            {commerce.open_at} - {commerce.closed_at}
          </span>
        </div>
        {commerce.queue && (
          <div className="mt-2">
            <span
              className={`badge ${commerce.queue.status === "open" ? "badge-success" : "badge-error"}`}
            >
              Fila {commerce.queue.status === "open" ? "aberta" : "fechada"}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default CommerceCard;
