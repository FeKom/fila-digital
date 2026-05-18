import Link from "next/link";
import { UserQueue } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

type QueuePositionCardProps = {
  queue: UserQueue;
};

const QueuePositionCard = ({ queue }: QueuePositionCardProps) => {
  return (
    <Link href={`/comercio/${queue.commerce_id}`} className="block group">
      <Card className="relative h-full overflow-hidden border-0 ring-1 ring-primary/15 hover:ring-primary/35 transition-all duration-200 hover:shadow-[0_0_24px_rgba(121,158,255,0.08)]">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {queue.queue_name}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {queue.commerce_name}
              </p>
            </div>
            {/* Pulse dot indicating active wait */}
            <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className="text-5xl font-black text-primary leading-none tabular-nums tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              #{queue.position}
            </span>
            <span className="text-xs text-muted-foreground">na fila</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default QueuePositionCard;
