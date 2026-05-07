export type CommerceAddress = {
  id?: string;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Commerce = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  phone: string;
  document_id: string;
  created_at: string;
  updated_at: string;
  open_at: string;
  closed_at: string;
  active: boolean;
  address?: CommerceAddress | null;
  admins?: string[];
};

export type CommerceInput = {
  name: string;
  description?: string;
  phone?: string;
  document_id: string;
  open_at?: string;
  closed_at?: string;
  // Flat address fields sent by the frontend
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type NearbyCommerce = {
  commerce_id: string;
  name: string;
  description: string | null;
  queue_id: string;
  created_at: Date;
  latitude: number | null;
  longitude: number | null;
  participants_waiting: string | number;
  distance_meters?: number | null;
};
