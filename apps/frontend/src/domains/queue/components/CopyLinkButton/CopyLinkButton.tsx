"use client";
import { useState } from "react";

type Props = { commerceId: string; qrcodeToken: string };

const CopyLinkButton = ({ commerceId, qrcodeToken }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/entrar-fila?commerceId=${commerceId}&token=${qrcodeToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
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
      {copied ? "✓ Link copiado!" : "Compartilhar link da fila"}
    </button>
  );
};

export default CopyLinkButton;
