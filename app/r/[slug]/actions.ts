"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { PetSize, Prisma } from "@prisma/client";
import { z } from "zod";
import { freeSlots, type BookingRequest } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { planOf } from "@/lib/plan";

const MAX_OPEN_PER_PHONE = 3;
const MAX_OPEN_PER_SALON = 100;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;

// Requests from one address, in memory: enough to slow down a script on one server
const recent = new Map<string, { count: number; until: number }>();

async function allowedNow() {
  const source = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "yerel";
  const now = Date.now();
  if (recent.size > 5000) recent.clear();
  const entry = recent.get(source);
  if (!entry || entry.until < now) {
    recent.set(source, { count: 1, until: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

/** The salon behind a public address, only while it takes online requests */
async function openSalon(slug: string) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, isDemo: true, createdAt: true, entryEndsAt: true, paidUntil: true, bookingEnabled: true, openTime: true, closeTime: true, closedDays: true },
  });
  if (!business?.bookingEnabled || planOf(business).level === "RESTRICTED") return null;
  return business;
}

const pickedServices = (businessId: string, ids: string[]) =>
  prisma.service.findMany({
    where: { businessId, isActive: true, id: { in: ids } },
    select: { id: true, name: true, durationMinutes: true, stationType: true },
  });

export async function slotsFor(slug: string, day: string, serviceIds: string[]): Promise<string[]> {
  const business = await openSalon(slug);
  if (!business) return [];
  const services = await pickedServices(business.id, serviceIds.slice(0, 20));
  const slots = await freeSlots({ businessId: business.id, openTime: business.openTime, closeTime: business.closeTime, closedDays: business.closedDays, services, day });
  return slots.map((s) => s.time);
}

const requestSchema = z.object({
  slug: z.string().max(60),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  serviceIds: z.array(z.string()).min(1, "Bir hizmet seçin").max(20),
  size: z.nativeEnum(PetSize),
  petName: z.string().trim().min(1, "Dostunuzun adını yazın").max(40),
  breed: z.string().trim().max(60).optional(),
  name: z.string().trim().min(2, "Adınızı yazın").max(80),
  phone: z.string().refine(isValidPhone, "Telefonu 05XX XXX XX XX biçiminde yazın"),
  note: z.string().trim().max(300).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Aydınlatma metnini onaylayın" }) }),
  /** Hidden from people; only a script fills it */
  website: z.string().max(0).optional(),
});

export type BookingInput = z.infer<typeof requestSchema>;

export async function requestAppointment(input: BookingInput): Promise<{ error: string } | { ok: true }> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!(await allowedNow())) return { error: "Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin." };

  const business = await openSalon(d.slug);
  if (!business) return { error: "Bu salon şu an online randevu almıyor." };
  const phone = normalizePhone(d.phone);

  const open = await prisma.appointment.findMany({
    where: { businessId: business.id, status: "REQUESTED" },
    select: { request: true },
  });
  if (open.length >= MAX_OPEN_PER_SALON) return { error: "Salon şu an çok fazla talep bekliyor. Lütfen telefonla ulaşın." };
  if (open.filter((a) => (a.request as unknown as BookingRequest | null)?.phone === phone).length >= MAX_OPEN_PER_PHONE) {
    return { error: "Bu numarayla bekleyen talepleriniz var. Salonun yanıtını bekleyin." };
  }

  const services = await pickedServices(business.id, d.serviceIds);
  if (services.length !== new Set(d.serviceIds).size) return { error: "Seçilen hizmetlerden biri bulunamadı." };

  // The list may be minutes old: the time is checked again here
  const slot = (await freeSlots({ businessId: business.id, openTime: business.openTime, closeTime: business.closeTime, closedDays: business.closedDays, services, day: d.day })).find((s) => s.time === d.time);
  if (!slot) return { error: "Bu saat az önce doldu. Başka bir saat seçin." };

  const request: BookingRequest = { name: d.name, phone, petName: d.petName, breed: d.breed || null, size: d.size };
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      stationId: slot.stationId,
      title: `${d.petName} · ${services.map((s) => s.name).join(", ")}`.slice(0, 180),
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: "REQUESTED",
      notes: d.note || null,
      request: request as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/randevular");
  revalidatePath("/bugun");
  return { ok: true };
}
