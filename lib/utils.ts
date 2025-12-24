// lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind + custom classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
