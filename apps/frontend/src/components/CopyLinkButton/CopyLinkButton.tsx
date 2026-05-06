"use client";
import { useState } from "react";

type Props = { commerceId: string };

const CopyLinkButton = ({ commerceId }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/entrar/${commerceId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select a temp input
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      className={`fd-btn fd-btn-sm ${copied ? "fd-btn-ghost" : "fd-btn-secondary"}`}
      onClick={handleCopy}
    >
      {copied ? "✓ Link copiado!" : "Copiar link da fila"}
    </button>
  );
};

export default CopyLinkButton;
