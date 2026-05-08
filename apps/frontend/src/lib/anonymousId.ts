import { uuidv7 } from "uuidv7";

const STORAGE_KEY = "fd:anonymous_id";

export const getAnonymousId = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const id = uuidv7();
      localStorage.setItemtem(STORAGE_KEY, id);
      return id;
    }
    return stored;
  } catch {
    return uuidv7();
  }
};

export const clearAnonymousId = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};
