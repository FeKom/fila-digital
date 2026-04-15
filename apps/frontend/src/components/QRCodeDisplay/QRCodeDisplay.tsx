type QRCodeDisplayProps = {
  base64Image: string;
  queueName: string;
};

const QRCodeDisplay = ({ base64Image, queueName }: QRCodeDisplayProps) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          display: "inline-flex",
        }}
      >
        <img
          src={base64Image}
          alt={`QR Code para fila ${queueName}`}
          style={{
            width: "200px",
            height: "200px",
            display: "block",
            borderRadius: "6px",
          }}
        />
      </div>
      <a
        href={base64Image}
        download={`qrcode-${queueName}.png`}
        className="fd-btn fd-btn-ghost fd-btn-sm"
      >
        Baixar QR Code
      </a>
    </div>
  );
};

export default QRCodeDisplay;
