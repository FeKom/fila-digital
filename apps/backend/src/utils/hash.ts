import { hash, compare } from "bcryptjs";

const salt = 8;
export const hashPassword = async (password: string) => {
  return hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string) => {
  return compare(password, hash);
};

// Valid bcrypt hash with the same cost as `salt`. Comparing against it when
// the email does not exist makes that response as slow as a wrong password,
// so response time does not reveal which emails have an account.
export const DUMMY_PASSWORD_HASH =
  "$2b$08$siYtmsagKpi1vtC56vCBuOadYosXe.W0nnVt0TmQ5MfiCeo0EFMQW";
