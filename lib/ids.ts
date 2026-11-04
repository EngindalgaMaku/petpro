import { randomBytes } from "node:crypto";
import { dayKeyTR } from "@/lib/turkey-time";

// Unambiguous letters and digits for numbers people read out over the phone (no 0/O, 1/I)
const READABLE = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function readable(length: number) {
  const bytes = randomBytes(length);
  return [...bytes].map((b) => READABLE[b % READABLE.length]).join("");
}

/** Work order number: AP-261030-K7QM (date + random, unique across all businesses) */
export const newWorkOrderNumber = () => `PP-${dayKeyTR(new Date()).slice(2).replace(/-/g, "")}-${readable(4)}`;

/** Key of the public tracking link; long enough that links cannot be guessed */
export const newTrackingToken = () => randomBytes(16).toString("base64url");
