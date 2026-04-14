import { hash, compare } from "bcryptjs";

const salt = 8;
export const hashPassword = async (password: string) => {
  return hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string) => {
  return compare(password, hash);
};
