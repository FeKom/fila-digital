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
  latitude?: number | null;
  longitude?: number | null;
};

export type NearbyCommerce = {
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  open_queues_count: string | number;
  distance_meters: number;
};
