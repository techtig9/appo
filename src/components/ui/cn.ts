import clsx, { type ClassValue } from "clsx";

/**
 * Class name joiner. `clsx` is already a dependency; this wrapper exists
 * so components import one thing and a class-merge strategy can change in
 * one place later if it needs to.
 */
export function cn(...values: ClassValue[]): string {
  return clsx(values);
}
