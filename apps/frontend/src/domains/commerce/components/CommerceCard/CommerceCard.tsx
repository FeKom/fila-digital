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
    <Link href={`/comercio/${commerce.id}/dashboard`} className="group block">
      <Card
        className={cn(
          "relative h-full border border-border transition-colors duration-150",
          hasQueue && isOpen
            ? "hover:border-success/50"
            : "hover:border-primary/40"
        )}
      >
        <div
          className={cn(
            "absolute top-0 right-0 left-0 h-[2px] transition-opacity",
            hasQueue && isOpen ? "bg-success opacity-70" : "bg-muted opacity-0"
          )}
        />

        <CardHeader className="pt-5 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn(
                "text-sm leading-tight font-semibold transition-colors",
                "group-hover:text-primary"
              )}
            >
              {commerce.name}
            </CardTitle>

            {hasQueue && (
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase",
                  isOpen
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground"
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
          <div className="mt-1 flex items-center justify-between">
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
                "text-muted-foreground/40 transition-transform duration-150",
                "group-hover:translate-x-0.5 group-hover:text-primary"
              )}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default CommerceCard;
