// ─── Domain types ─────────────────────────────────────────────────────────────

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type QueueType = "ephemera" | "permanent";
export type QueueStatus = "open" | "closed";

export type Queue = {
  id: string;
  name: string;
  description: string;
  type: QueueType;
  status: QueueStatus;
  commerce_id: string;
  qrcode_token?: string;
  qrcode?: string;
  created_at: string;
};

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
  phone: string;
  document_id: string;
  open_at: string;
  closed_at: string;
  owner_id: string;
  active: boolean;
  address?: CommerceAddress | null;
  queue?: Queue;
};

export type NearbyCommerce = {
  commerce_id: string;
  name: string;
  description: string | null;
  queue_id: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  participants_waiting: number;
  distance_meters?: number | null;
};

export type ParticipantStatus = "waiting" | "called" | "done" | "exited";

export type Participant = {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  queue_id: string;
  commerce_id: string;
  position: number;
  status?: ParticipantStatus;
};

export type UserQueue = {
  queue_id: string;
  commerce_id: string;
  queue_name: string;
  commerce_name: string;
  position: number;
};

// ─── API response shapes ───────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
};

export type AuthResponse = {
  token: string;
  message?: string;
};

// ─── Input types ──────────────────────────────────────────────────────────────

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type CommerceInput = {
  name: string;
  description?: string;
  phone?: string;
  document_id: string;
  open_at?: string;
  closed_at?: string;
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

export type QueueInput = {
  name: string;
  description: string;
  type: QueueType;
  status: QueueStatus;
};

export type EnterQueueInput = {
  queue_id: string;
  qrcode_token: string;
  user_id?: string;
  anonymous_id?: string;
};
