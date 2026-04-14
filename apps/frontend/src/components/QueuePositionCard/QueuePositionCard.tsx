import Link from "next/link";
import { UserQueue } from "@/types";

type QueuePositionCardProps = {
  queue: UserQueue;
};

const QueuePositionCard = ({ queue }: QueuePositionCardProps) => {
  return (
    <Link
      href={`/comercio/${queue.commerce_id}`}
      className="card bg-base-100 shadow-md border border-base-200"
    >
      <div className="card-body p-5">
        <h3 className="card-title text-lg">{queue.queue_name}</h3>
        <p className="text-sm text-gray-500">{queue.commerce_name}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="badge badge-primary badge-lg text-lg font-bold">
            #{queue.position}
          </span>
          <span className="text-sm text-gray-400">na fila</span>
        </div>
      </div>
    </Link>
  );
};

export default QueuePositionCard;
