import clsx, { ClassValue } from "clsx";

export const cnJoin = (...classes: unknown[]) => {
  return clsx(...(classes as ClassValue[]));
};
