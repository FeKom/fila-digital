import Link from "next/link";
import { Commerce } from "@/types";
import Badge from "@/components/Badge/Badge";

type CommerceCardProps = {
  commerce: Commerce;
};

const CommerceCard = ({ commerce }: CommerceCardProps) => {
  const statusClass = commerce.queue
    ? commerce.queue.status === "open"
      ? "commerce-card-open"
      : "commerce-card-closed"
    : "";

  return (
    <Link
      href={`/comercio/${commerce.id}`}
      className={`commerce-card ${statusClass}`}
    >
      <div className="commerce-card-name">{commerce.name}</div>
      {commerce.description && (
        <div
          className="commerce-card-meta"
          style={{
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            marginBottom: "0.5rem",
          }}
        >
          {commerce.description}
        </div>
      )}
      <div className="commerce-card-meta" style={{ marginBottom: "0.6rem" }}>
        {commerce.open_at} — {commerce.closed_at}
      </div>
      {commerce.queue && (
        <Badge variant={commerce.queue.status === "open" ? "success" : "error"}>
          Fila {commerce.queue.status === "open" ? "aberta" : "fechada"}
        </Badge>
      )}
    </Link>
  );
};

export default CommerceCard;
