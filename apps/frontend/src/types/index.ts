export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Commerce {
  id: string;
  name: string;
  description: string;
  phone: string;
  document_id: string;
  open_at: string;
  closed_at: string;
  user_id: string;
  queue?: Queue;
}

export interface Queue {
  id: string;
  name: string;
  description: string;
  type: "ephemera" | "permanent";
  status: "open" | "closed";
  commerce_id: string;
  qrcode?: string;
}

export interface Participant {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  queue_id: string;
  commerce_id: string;
  position: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CommerceInput {
  name: string;
  description: string;
  phone: string;
  document_id: string;
  open_at: string;
  closed_at: string;
}

export interface QueueInput {
  name: string;
  description: string;
  type: "ephemera" | "permanent";
  status: "open" | "closed";
}

export interface EnterQueueInput {
  queueId: string;
  qrcodeToken: string;
  userId?: string;
  anonymousId?: string;
}

export interface UserQueue {
  queue_id: string;
  commerce_id: string;
  queue_name: string;
  commerce_name: string;
  position: number;
}
