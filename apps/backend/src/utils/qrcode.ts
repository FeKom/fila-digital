import QRCode from "qrcode";

export const generateQrCodeBase64 = async (data: string): Promise<string> => {
  return QRCode.toDataURL(data);
};
