export type Queue = {
  id: string;
  commerce_id: string;
  participant_id: string;
  name: string;
  description: string;
  type: "ephemera" | "permanent";
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  active: boolean;
  qrcode_token: string;
};
