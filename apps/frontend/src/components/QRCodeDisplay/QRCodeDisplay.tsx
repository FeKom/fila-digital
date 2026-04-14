type QRCodeDisplayProps = {
  base64Image: string;
  queueName: string;
};

const QRCodeDisplay = ({ base64Image, queueName }: QRCodeDisplayProps) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={base64Image}
        alt={`QR Code para fila ${queueName}`}
        className="w-64 h-64 border border-base-200 rounded-lg"
      />
      <a
        href={base64Image}
        download={`qrcode-${queueName}.png`}
        className="btn btn-outline btn-sm rounded-field"
      >
        Baixar QR Code
      </a>
    </div>
  );
};

export default QRCodeDisplay;
