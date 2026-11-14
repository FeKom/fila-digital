import React from "react";
import { Queue } from "@/types";
import { QRCodeDisplay } from "@/domains/queue/components/QRCodeDisplay";
import { CopyLinkButton } from "@/domains/queue/components/CopyLinkButton";

type Props = {
  commerceId: string;
  queue: Queue;
};

export default function QueueShareCard({
  commerceId,
  queue,
}: Props): React.ReactElement {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-bg-surface p-6">
      <p className="m-0 text-xs font-bold tracking-widest text-text-3 uppercase">
        Compartilhar Fila
      </p>

      {queue.qrcode ? (
        <QRCodeDisplay base64Image={queue.qrcode} queueName={queue.name} />
      ) : (
        <p className="text-sm text-text-3">QR Code não disponível.</p>
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
