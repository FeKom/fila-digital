"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type QueueAttendanceStatus = "waiting" | "called" | "ready";

export type QueueStanchionsProps = {
  position: number | null;
  status?: QueueAttendanceStatus;
  className?: string;
};

const POST_X = [60, 190, 320, 450, 580] as const;
const BAY_CENTERS = [125, 255, 385, 515] as const;

export const QueueStanchions = ({
  position,
  status = "waiting",
  className,
}: QueueStanchionsProps): React.ReactElement => {
  const safePosition = position && position > 0 ? position : 1;
  const activeBayIndex =
    status === "waiting" ? Math.min(safePosition, 4) - 1 : 0;
  const isOpen = status === "called" || status === "ready";
  const highlight = isOpen ? "var(--success)" : "var(--primary)";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-bg-surface px-3 pt-4 pb-3",
        className
      )}
      data-testid="queue-stanchions"
      data-status={status}
    >
      {/* Top status strip — flat editorial typography, no pulsing dots */}
      <div className="mb-2 flex items-center justify-between border-b border-border pb-2 px-2 text-xs">
        <span className="font-mono font-semibold tracking-wider text-text-2 uppercase">
          {isOpen ? "Entrada liberada" : "Fila de atendimento"}
        </span>
        <span className="font-mono font-semibold text-text-1">
          {status === "waiting"
            ? `Posição #${safePosition}`
            : status === "called"
              ? "Sua vez chegou"
              : "Pedido pronto"}
        </span>
      </div>

      <svg
        viewBox="0 0 640 210"
        className="h-auto w-full select-none"
        role="img"
        aria-label={
          status === "waiting"
            ? `Fila com cordões de veludo: você está na posição ${safePosition}`
            : status === "called"
              ? "Cordão aberto: sua vez chegou"
              : "Seu pedido está pronto para retirada"
        }
      >
        <defs>
          <linearGradient id="goldPost" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              style={{ stopColor: "var(--stanchion-post-1)" }}
            />
            <stop
              offset="28%"
              style={{ stopColor: "var(--stanchion-post-2)" }}
            />
            <stop
              offset="52%"
              style={{ stopColor: "var(--stanchion-post-3)" }}
            />
            <stop
              offset="78%"
              style={{ stopColor: "var(--stanchion-post-4)" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--stanchion-post-5)" }}
            />
          </linearGradient>

          <radialGradient id="goldBall" cx="35%" cy="30%" r="65%">
            <stop
              offset="0%"
              style={{ stopColor: "var(--stanchion-post-2)" }}
            />
            <stop
              offset="45%"
              style={{ stopColor: "var(--stanchion-post-4)" }}
            />
            <stop
              offset="80%"
              style={{ stopColor: "var(--stanchion-post-3)" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--stanchion-post-5)" }}
            />
          </radialGradient>

          <linearGradient id="velvetRope" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: "var(--stanchion-rope-1)" }}
            />
            <stop
              offset="35%"
              style={{ stopColor: "var(--stanchion-rope-2)" }}
            />
            <stop
              offset="75%"
              style={{ stopColor: "var(--stanchion-rope-3)" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--stanchion-rope-4)" }}
            />
          </linearGradient>
        </defs>

        {/* Floor perspective line */}
        <line
          x1="36"
          y1="184"
          x2="604"
          y2="184"
          style={{ stroke: "var(--border)" }}
          strokeWidth="1"
        />

        {/* Bay markers (people ahead + user marker) */}
        {BAY_CENTERS.map((centerX, idx) => {
          const slotNumber =
            idx === 3 && safePosition > 4 ? safePosition : idx + 1;
          const isUserSlot = idx === activeBayIndex;
          const isAheadSlot = status === "waiting" && idx < activeBayIndex;

          return (
            <g key={`bay-${centerX}`}>
              <text
                x={centerX}
                y="202"
                textAnchor="middle"
                style={{ fill: isUserSlot ? highlight : "var(--text-3)" }}
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {idx === 0 && isOpen ? "PASSE" : `#${slotNumber}`}
              </text>

              {isAheadSlot && (
                <g opacity="0.42">
                  <circle
                    cx={centerX}
                    cy="72"
                    r="10"
                    style={{ fill: "var(--text-3)" }}
                  />
                  <path
                    d={`M ${centerX - 16} 102 C ${centerX - 16} 86, ${centerX + 16} 86, ${centerX + 16} 102`}
                    style={{ fill: "var(--text-2)" }}
                  />
                </g>
              )}

              {/* Rectangular editorial tag instead of rounded pill */}
              {isUserSlot && (
                <g>
                  <rect
                    x={centerX - 44}
                    y="22"
                    width="88"
                    height="28"
                    rx="4"
                    style={{
                      fill: "var(--bg-elevated)",
                      stroke: highlight,
                    }}
                    strokeWidth="1.5"
                  />
                  <text
                    x={centerX}
                    y="40"
                    textAnchor="middle"
                    style={{ fill: "var(--text-1)" }}
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                  >
                    {isOpen ? "SUA VEZ" : `VOCÊ #${safePosition}`}
                  </text>
                  <path
                    d={`M ${centerX - 5} 50 L ${centerX + 5} 50 L ${centerX} 57 Z`}
                    style={{ fill: highlight }}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Ropes */}
        {[0, 1, 2, 3].map((bayIdx) => {
          const x1 = POST_X[bayIdx] + 7;
          const x2 = POST_X[bayIdx + 1] - 7;
          const midX = (x1 + x2) / 2;

          if (bayIdx === 0 && isOpen) {
            return (
              <g key={`rope-${bayIdx}`}>
                <path
                  d={`M ${x2} 84 Q ${x2 - 18} 138 ${x2 - 10} 168`}
                  fill="none"
                  stroke="url(#velvetRope)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <circle cx={x2 - 10} cy="169" r="5.5" fill="url(#goldPost)" />
              </g>
            );
          }

          return (
            <g key={`rope-${bayIdx}`}>
              <path
                d={`M ${x1} 86 Q ${midX} 152 ${x2} 86`}
                fill="none"
                style={{ stroke: "var(--stanchion-shadow)" }}
                strokeWidth="12"
                strokeLinecap="round"
              />
              <path
                d={`M ${x1} 83 Q ${midX} 148 ${x2} 83`}
                fill="none"
                stroke="url(#velvetRope)"
                strokeWidth="11"
                strokeLinecap="round"
              />
              <path
                d={`M ${x1 + 2} 80 Q ${midX} 144 ${x2 - 2} 80`}
                fill="none"
                style={{
                  stroke: "color-mix(in srgb, var(--cream) 35%, transparent)",
                }}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <rect
                x={x1 - 3}
                y="77"
                width="8"
                height="11"
                rx="2"
                fill="url(#goldPost)"
              />
              <rect
                x={x2 - 5}
                y="77"
                width="8"
                height="11"
                rx="2"
                fill="url(#goldPost)"
              />
            </g>
          );
        })}

        {/* 5 stanchion posts */}
        {POST_X.map((x, idx) => (
          <g key={`post-${x}`}>
            <ellipse
              cx={x}
              cy="184"
              rx="26"
              ry="6"
              style={{ fill: "var(--stanchion-shadow)" }}
            />
            <path
              d={`M ${x - 24} 182 L ${x + 24} 182 L ${x + 20} 175 L ${x - 20} 175 Z`}
              fill="url(#goldPost)"
            />
            <ellipse
              cx={x}
              cy="175"
              rx="20"
              ry="4"
              style={{ fill: "var(--stanchion-post-2)" }}
            />
            <rect
              x={x - 5}
              y="68"
              width="10"
              height="107"
              fill="url(#goldPost)"
            />
            <rect
              x={x - 8}
              y="72"
              width="16"
              height="6"
              rx="2"
              fill="url(#goldPost)"
            />
            <circle cx={x} cy="60" r="8.5" fill="url(#goldBall)" />
            {idx === 0 && (
              <text
                x={x}
                y="42"
                textAnchor="middle"
                style={{ fill: "var(--accent)" }}
                fontSize="9"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                INÍCIO
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default QueueStanchions;
