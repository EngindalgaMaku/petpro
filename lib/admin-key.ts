import { timingSafeEqual } from "node:crypto";

/** The owner's page needs its own long key; without one set it does not exist */
export function adminKeyMatches(given: string | undefined | null) {
  const real = process.env.ADMIN_KEY;
  if (!real || real.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}
