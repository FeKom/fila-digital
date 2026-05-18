import Link from "next/link";
import { Commerce } from "@/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, ChevronRight } from "lucide-react";

type CommerceCardProps = {
  commerce: Commerce;
};

const CommerceCard = ({ commerce }: CommerceCardProps) => {
  const isOpen = commerce.queue?.status === "open";
  const hasQueue = !!commerce.queue;

  return (
    <Link href={`/comercio/${commerce.id}/dashboard`} className="block group">
      <Card
        className={cn(
          "relative h-full transition-all duration-200 border-0",
          "ring-1 hover:ring-2",
          hasQueue && isOpen
            ? "ring-success/20 hover:ring-success/40 shadow-[0_0_20px_rgba(74,222,128,0.04)]"
            : "ring-foreground/8 hover:ring-primary/30 hover:shadow-[0_0_20px_rgba(121,158,255,0.06)]"
        )}
      >
        {/* Status bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px] transition-opacity",
            hasQueue && isOpen ? "bg-success opacity-70" : "bg-muted opacity-0"
          )}
        />

        <CardHeader className="pt-5 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn(
                "text-sm font-semibold leading-tight transition-colors",
                "group-hover:text-primary"
              )}
            >
              {commerce.name}
            </CardTitle>

            {hasQueue && (
              <span
                className={cn(
                  "shrink-0 mt-0.5 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full",
                  isOpen
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isOpen ? "Aberta" : "Fechada"}
              </span>
            )}
          </div>

          {commerce.description && (
            <CardDescription className="line-clamp-2 text-xs leading-relaxed">
              {commerce.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pb-4">
          <div className="flex items-center justify-between mt-1">
            {commerce.open_at && commerce.closed_at ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock size={10} className="shrink-0" />
                <span>
                  {commerce.open_at} — {commerce.closed_at}
                </span>
              </div>
            ) : (
              <span />
            )}

            <ChevronRight
              size={13}
              className={cn(
                "text-muted-foreground/30 transition-all duration-200",
                "group-hover:text-primary group-hover:translate-x-0.5"
              )}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CommerceCard;
