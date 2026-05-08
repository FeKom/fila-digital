import { Queue } from "@/types";
import { QRCodeDisplay } from "@/domains/queue/components/QRCodeDisplay";
import { CopyLinkButton } from "@/domains/queue/components/CopyLinkButton";

type Props = {
  commerceId: string;
  queue: Queue;
};

export default function QueueShareCard({ commerceId, queue }: Props) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-3)",
          margin: 0,
        }}
      >
        Compartilhar Fila
      </p>

      {queue.qrcode ? (
        <QRCodeDisplay base64Image={queue.qrcode} queueName={queue.name} />
      ) : (
        <p style={{ fontSize: "0.875rem", color: "var(--text-3)" }}>
          QR Code não disponível.
        </p>
      )}

      {queue.qrcode_token && (
        <CopyLinkButton
          commerceId={commerceId}
          qrcodeToken={queue.qrcode_token}
        />
      )}
    </div>
  );
}
