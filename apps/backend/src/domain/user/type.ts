export type UserRole = "OWNER" | "CUSTOMER";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  commerce_id: string | null;
  created_at: string;
  updated_at: string;
};
