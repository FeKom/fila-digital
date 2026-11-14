import React from "react";
import Link from "next/link";
import { QueueStanchions } from "@/domains/queue/components/QueueStanchions";

export default function Home(): React.ReactElement {
  return (
    <div className="landing-hero">
      <div className="landing-bg">
        <div className="landing-bg-grid" />
        <div className="landing-bg-glow" />
      </div>

      <span className="landing-eyebrow">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        Fila digital + Cardápio integrado
      </span>

      <h1 className="landing-title">
        Filas sem
        <br />
        <span>sufoco.</span>
      </h1>

      <p className="landing-desc">
        Entre na fila de qualquer lugar, consulte o cardápio enquanto espera e
        receba o aviso assim que sua vez ou seu pedido estiver pronto.
      </p>

      {/* Primary CTAs */}
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/filas-proximas" className="fd-btn fd-btn-primary">
          Ver filas próximas
        </Link>
        <Link href="/procurar-fila" className="fd-btn fd-btn-secondary">
          Procurar estabelecimento
        </Link>
        <Link href="/meus-comercios" className="fd-btn fd-btn-ghost">
          Sou empresa
        </Link>
      </div>

      {/* Live Velvet Rope Preview */}
      <div className="relative z-10 mt-12 w-full max-w-2xl text-left">
        <QueueStanchions position={2} status="waiting" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-bg-surface/90 p-3.5">
            <span className="font-mono text-xs font-bold text-primary">
              01 • NA FILA
            </span>
            <p className="mt-1 text-xs text-text-2">
              Acompanhe sua posição real nos cordões e explore o catálogo.
            </p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-bg-surface/90 p-3.5">
            <span className="font-mono text-xs font-bold text-accent">
              02 • SUA VEZ CHEGOU
            </span>
            <p className="mt-1 text-xs text-text-2">
              O cordão se abre na tela quando o atendente chama você.
            </p>
          </div>
          <div className="rounded-xl border border-success/30 bg-bg-surface/90 p-3.5">
            <span className="font-mono text-xs font-bold text-success">
              03 • PEDIDO PRONTO
            </span>
            <p className="mt-1 text-xs text-text-2">
              Aviso imediato na tela assim que seu pedido puder ser retirado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
