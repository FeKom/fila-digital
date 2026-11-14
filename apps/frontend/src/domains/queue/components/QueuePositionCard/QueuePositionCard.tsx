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
      <Card className="relative h-full overflow-hidden border border-border transition-colors duration-150 hover:border-primary/40">
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
            <span className="shrink-0 font-mono text-[11px] font-semibold tracking-wider text-text-3 uppercase">
              Ativa
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
