import type { PetSize, StationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, dayKeyTR, parseDayTR, startOfDayTR } from "@/lib/turkey-time";

// Online booking: the owner picks a free time on the salon's public page and leaves a request.
// The request holds its slot until the salon answers. No customer or pet record is made before
// that, so made-up requests never reach the customer list.

export const BOOKING_DAYS_AHEAD = 14;
const SLOT_MINUTES = 30;
/** Nobody can ask for a time that starts sooner than this */
const NOTICE_MINUTES = 60;
const MINUTE = 60 * 1000;

/** What the owner typed. It lives on the appointment only until the salon answers */
export interface BookingRequest {
  name: string;
  phone: string;
  petName: string;
  breed: string | null;
  size: PetSize;
}

const TR_LETTERS: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" };

/** "Köyceğiz Pet Kuaför" → "koycegiz-pet-kuafor" */
export function slugify(name: string) {
  const slug = name
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => TR_LETTERS[c])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return slug || "salon";
}

/** The business's public address, made the first time it is needed */
export async function ensureSlug(business: { id: string; name: string; slug: string | null }) {
  if (business.slug) return business.slug;
  const base = slugify(business.name);
  for (let i = 1; i < 500; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await prisma.business.findUnique({ where: { slug }, select: { id: true } }))) {
      await prisma.business.update({ where: { id: business.id }, data: { slug } });
      return slug;
    }
  }
  throw new Error("Adres oluşturulamadı");
}

const closedDays = (value: string) => value.split(",").filter(Boolean).map(Number);

/** Whether the salon works on a "YYYY-MM-DD" day (0 = Sunday) */
export function isOpenDay(closed: string, day: string) {
  const start = parseDayTR(day);
  if (!start) return false;
  return !closedDays(closed).includes(new Date(`${day}T12:00:00Z`).getUTCDay());
}

export function bookableDays(closed: string, now = new Date()) {
  const today = startOfDayTR(now);
  return Array.from({ length: BOOKING_DAYS_AHEAD }, (_, i) => dayKeyTR(addDays(today, i))).map((day) => ({ day, open: isOpenDay(closed, day) }));
}

const clock = (at: Date) => at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

/** The work happens where its longest service happens */
function stationTypeOf(services: Array<{ durationMinutes: number; stationType: StationType | null }>) {
  return [...services].sort((a, b) => b.durationMinutes - a.durationMinutes).find((s) => s.stationType)?.stationType ?? null;
}

interface SlotInput {
  businessId: string;
  openTime: string;
  closeTime: string;
  closedDays: string;
  services: Array<{ durationMinutes: number; stationType: StationType | null }>;
  day: string;
  now?: Date;
}

/** Free start times of a day, each with a station that stays free for the whole job */
export async function freeSlots({ businessId, openTime, closeTime, closedDays: closed, services, day, now = new Date() }: SlotInput) {
  const allowed = bookableDays(closed, now).find((d) => d.day === day);
  if (!allowed?.open || services.length === 0) return [];
  const minutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const opens = new Date(`${day}T${openTime}:00+03:00`);
  const closes = new Date(`${day}T${closeTime}:00+03:00`);
  const type = stationTypeOf(services);

  const all = await prisma.station.findMany({ where: { businessId, isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, type: true } });
  const fitting = all.filter((s) => s.type === type);
  const stations = fitting.length ? fitting : all;
  const taken = await prisma.appointment.findMany({
    where: { businessId, status: { in: ["REQUESTED", "BOOKED", "ARRIVED"] }, stationId: { not: null }, startsAt: { lt: closes }, endsAt: { gt: opens } },
    select: { stationId: true, startsAt: true, endsAt: true },
  });

  const earliest = now.getTime() + NOTICE_MINUTES * MINUTE;
  const slots: Array<{ time: string; startsAt: Date; endsAt: Date; stationId: string }> = [];
  for (let at = opens.getTime(); at + minutes * MINUTE <= closes.getTime(); at += SLOT_MINUTES * MINUTE) {
    if (at < earliest) continue;
    const end = at + minutes * MINUTE;
    const station = stations.find((s) => !taken.some((a) => a.stationId === s.id && a.startsAt.getTime() < end && a.endsAt.getTime() > at));
    if (station) slots.push({ time: clock(new Date(at)), startsAt: new Date(at), endsAt: new Date(end), stationId: station.id });
  }
  return slots;
}
