import React from "react";
import Link from "next/link";
import { QueueStanchions } from "@/domains/queue/components/QueueStanchions";

export default function Home(): React.ReactElement {
  return (
    <div className="landing-hero">
      <p className="landing-eyebrow">Fila digital e cardápio integrado</p>

      <h1 className="landing-title">
        Filas sem
        <br />
        <span>sufoco.</span>
      </h1>

      <p className="landing-desc">
        Entre na fila de qualquer lugar, consulte o cardápio enquanto espera e
        acompanhe o momento exato de ser atendido ou retirar seu pedido.
      </p>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3">
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

      {/* Live Velvet Rope Preview + Editorial Rule */}
      <div className="relative z-10 mt-10 w-full max-w-2xl text-left">
        <QueueStanchions position={2} status="waiting" />

        <dl className="mt-6 grid grid-cols-1 border-t border-border pt-5 sm:grid-cols-3 sm:divide-x sm:divide-border">
          <div className="pb-4 sm:pr-5 sm:pb-0">
            <dt className="font-mono text-xs font-semibold text-text-3">
              01 · Na fila
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-text-2">
              Veja sua posição nos cordões e escolha itens no catálogo.
            </dd>
          </div>
          <div className="py-4 sm:px-5 sm:py-0">
            <dt className="font-mono text-xs font-semibold text-text-3">
              02 · Sua vez chegou
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-text-2">
              O primeiro cordão abre na tela quando o balcão chama você.
            </dd>
          </div>
          <div className="pt-4 sm:pt-0 sm:pl-5">
            <dt className="font-mono text-xs font-semibold text-text-3">
              03 · Pedido pronto
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-text-2">
              Acompanhe o preparo até o aviso de retirada no balcão.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
