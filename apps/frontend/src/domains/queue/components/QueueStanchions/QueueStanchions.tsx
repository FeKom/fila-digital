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

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-bg-page/80 px-3 pt-4 pb-3",
        className
      )}
      data-testid="queue-stanchions"
      data-status={status}
    >
      {/* Top status strip */}
      <div className="mb-2 flex items-center justify-between px-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold tracking-wider text-accent uppercase">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isOpen ? "animate-ping bg-success" : "bg-accent"
            )}
          />
          {isOpen ? "Entrada liberada" : "Fila de atendimento"}
        </span>
        <span className="font-mono text-text-2">
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
          {/* Metallic Gold Post Gradient */}
          <linearGradient id="goldPost" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#854d0e" />
            <stop offset="28%" stopColor="#fde047" />
            <stop offset="52%" stopColor="#f59e0b" />
            <stop offset="78%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>

          {/* Gold Ball Finial Radial Gradient */}
          <radialGradient id="goldBall" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="80%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#713f12" />
          </radialGradient>

          {/* Velvet Red Rope Gradient */}
          <linearGradient id="velvetRope" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="35%" stopColor="#e11d48" />
            <stop offset="75%" stopColor="#9f1239" />
            <stop offset="100%" stopColor="#4c0519" />
          </linearGradient>

          {/* Open Green Rope / Accent Glow */}
          <radialGradient id="spotGlow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={isOpen ? "#4ade80" : "#799eff"}
              stopOpacity="0.32"
            />
            <stop
              offset="100%"
              stopColor={isOpen ? "#4ade80" : "#799eff"}
              stopOpacity="0"
            />
          </radialGradient>
        </defs>

        {/* Floor perspective line */}
        <ellipse
          cx="320"
          cy="188"
          rx="295"
          ry="12"
          fill="rgba(255,255,255,0.025)"
        />

        {/* Spotlight on active bay */}
        <ellipse
          cx={BAY_CENTERS[activeBayIndex]}
          cy="184"
          rx="62"
          ry="16"
          fill="url(#spotGlow)"
        />

        {/* Bay markers (people ahead + user marker) */}
        {BAY_CENTERS.map((centerX, idx) => {
          const slotNumber =
            idx === 3 && safePosition > 4 ? safePosition : idx + 1;
          const isUserSlot = idx === activeBayIndex;
          const isAheadSlot = status === "waiting" && idx < activeBayIndex;

          return (
            <g key={`bay-${centerX}`}>
              {/* Slot floor label */}
              <text
                x={centerX}
                y="202"
                textAnchor="middle"
                fill={
                  isUserSlot
                    ? isOpen
                      ? "#4ade80"
                      : "#799eff"
                    : "rgba(238,240,248,0.38)"
                }
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-mono)"
              >
                {idx === 0 && isOpen ? "PASSE" : `#${slotNumber}`}
              </text>

              {/* Silhouette for people ahead */}
              {isAheadSlot && (
                <g opacity="0.42">
                  <circle cx={centerX} cy="72" r="10" fill="#94a3b8" />
                  <path
                    d={`M ${centerX - 16} 102 C ${centerX - 16} 86, ${centerX + 16} 86, ${centerX + 16} 102`}
                    fill="#64748b"
                  />
                </g>
              )}

              {/* Active user badge floating in bay */}
              {isUserSlot && (
                <g>
                  <rect
                    x={centerX - 44}
                    y="22"
                    width="88"
                    height="30"
                    rx="15"
                    fill={isOpen ? "#064e3b" : "#172554"}
                    stroke={isOpen ? "#4ade80" : "#799eff"}
                    strokeWidth="1.5"
                  />
                  <text
                    x={centerX}
                    y="41"
                    textAnchor="middle"
                    fill="#eef0f8"
                    fontSize="11"
                    fontWeight="800"
                    fontFamily="var(--font-display)"
                  >
                    {isOpen ? "SUA VEZ!" : `VOCÊ #${safePosition}`}
                  </text>
                  <path
                    d={`M ${centerX - 6} 52 L ${centerX + 6} 52 L ${centerX} 60 Z`}
                    fill={isOpen ? "#4ade80" : "#799eff"}
                  />
                </g>
              )}
            </g>
          );
        })}

        {/* Ropes (drawn behind post caps for realistic depth) */}
        {[0, 1, 2, 3].map((bayIdx) => {
          const x1 = POST_X[bayIdx] + 7;
          const x2 = POST_X[bayIdx + 1] - 7;
          const midX = (x1 + x2) / 2;

          if (bayIdx === 0 && isOpen) {
            // Unhooked velvet rope hanging down on the second post
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
              {/* Drop shadow under rope */}
              <path
                d={`M ${x1} 86 Q ${midX} 152 ${x2} 86`}
                fill="none"
                stroke="rgba(0,0,0,0.45)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Main velvet rope body */}
              <path
                d={`M ${x1} 83 Q ${midX} 148 ${x2} 83`}
                fill="none"
                stroke="url(#velvetRope)"
                strokeWidth="11"
                strokeLinecap="round"
              />
              {/* Velvet sheen highlight */}
              <path
                d={`M ${x1 + 2} 80 Q ${midX} 144 ${x2 - 2} 80`}
                fill="none"
                stroke="rgba(255,228,230,0.35)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              {/* Gold clasps at both ends */}
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

        {/* 5 Golden Stanchion Posts */}
        {POST_X.map((x, idx) => (
          <g key={`post-${x}`}>
            {/* Floor shadow */}
            <ellipse cx={x} cy="184" rx="26" ry="6" fill="rgba(0,0,0,0.65)" />
            {/* Base plate lower */}
            <path
              d={`M ${x - 24} 182 L ${x + 24} 182 L ${x + 20} 175 L ${x - 20} 175 Z`}
              fill="url(#goldPost)"
            />
            {/* Base dome */}
            <ellipse cx={x} cy="175" rx="20" ry="4" fill="#fde047" />
            {/* Vertical cylindrical shaft */}
            <rect
              x={x - 5}
              y="68"
              width="10"
              height="107"
              fill="url(#goldPost)"
            />
            {/* Collar ring */}
            <rect
              x={x - 8}
              y="72"
              width="16"
              height="6"
              rx="2"
              fill="url(#goldPost)"
            />
            {/* Crown sphere finial */}
            <circle cx={x} cy="60" r="8.5" fill="url(#goldBall)" />
            {/* First post badge */}
            {idx === 0 && (
              <text
                x={x}
                y="42"
                textAnchor="middle"
                fill="#ffbc4c"
                fontSize="9"
                fontWeight="700"
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
