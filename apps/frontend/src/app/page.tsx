import Link from "next/link";

export default function Home() {
  return (
    <div className="landing-hero">
      <div className="landing-bg">
        <div className="landing-bg-grid" />
        <div className="landing-bg-glow" />
      </div>

      <span className="landing-eyebrow">
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "var(--primary)",
            display: "inline-block",
            animation: "logoPulse 2s ease-in-out infinite",
          }}
        />
        Sistema de filas
      </span>

      <h1 className="landing-title">
        Filas sem
        <br />
        <span>sufoco.</span>
      </h1>

      <p className="landing-desc">
        Gerencie filas do seu comércio ou entre em uma fila de qualquer lugar.
      </p>

      <div className="landing-ctas">
        <Link href="/login" className="fd-btn fd-btn-primary fd-btn-lg">
          Entrar
        </Link>
        <Link href="/registrar" className="fd-btn fd-btn-ghost fd-btn-lg">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
