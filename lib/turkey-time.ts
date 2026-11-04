// Day and month boundaries in Turkish time. Turkey has stayed on UTC+3 all year since 2016;
// the server clock may be UTC, so "today" is worked out from the offset, not the server zone.

const TR_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Midnight in Turkey at the start of the day containing `at` (default now) */
export function startOfDayTR(at: Date = new Date()) {
  const local = new Date(at.getTime() + TR_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - TR_OFFSET_MS);
}

/** Midnight in Turkey at the start of a "YYYY-MM-DD" date */
export function parseDayTR(day: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const utc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  // Date.UTC rolls 2026-13-40 over into a later date; only real calendar days are accepted
  if (utc.toISOString().slice(0, 10) !== day) return null;
  return new Date(utc.getTime() - TR_OFFSET_MS);
}

/** "YYYY-MM-DD" of the Turkish day that `at` falls on */
export function dayKeyTR(at: Date) {
  return new Date(at.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM" of the Turkish month that `at` falls on */
export function monthKeyTR(at: Date) {
  return dayKeyTR(at).slice(0, 7);
}

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
