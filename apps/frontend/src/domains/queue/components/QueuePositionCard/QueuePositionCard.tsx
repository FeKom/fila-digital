import React from "react";
import Link from "next/link";
import { UserQueue } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

type QueuePositionCardProps = {
  queue: UserQueue;
};

const QueuePositionCard = ({
  queue,
}: QueuePositionCardProps): React.ReactElement => {
  return (
    <Link href={`/comercio/${queue.commerce_id}`} className="group block">
      <Card className="relative h-full overflow-hidden border-0 ring-1 ring-primary/15 transition-all duration-200 hover:shadow-[0_0_24px_rgba(121,158,255,0.08)] hover:ring-primary/35">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

        <CardContent className="pt-5 pb-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {queue.queue_name}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {queue.commerce_name}
              </p>
            </div>
            <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl leading-none font-black tracking-tight text-primary tabular-nums">
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
