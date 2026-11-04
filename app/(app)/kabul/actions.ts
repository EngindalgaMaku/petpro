"use server";

import { z } from "zod";
import { PaymentMethod, PetSize, Prisma, Temperament, type ServiceKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { newTrackingToken, newWorkOrderNumber } from "@/lib/ids";
import { sizePrice } from "@/lib/money";
import { detailSummary, parseDetails, type ItemDetails } from "@/lib/service-kinds";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { planOf, RESTRICTED_ORDERS_PER_30_DAYS } from "@/lib/plan";
import { requireUser } from "@/lib/session";

export interface PetMatch {
  petId: string;
  name: string;
  breed: string | null;
  color: string | null;
  size: PetSize;
  birthYear: number | null;
  temperament: Temperament;
  allergies: string | null;
  vaccineDue: string | null;
  visits: number;
  lastVisit: { date: string; summary: string } | null;
  openOrder: { id: string; number: string } | null;
}

export interface OwnerMatch {
  id: string;
  name: string;
  notes: string | null;
  pets: PetMatch[];
}

/** The owner behind a phone number with their pets and each pet's last visit; null for a new number */
export async function findOwner(phone: string): Promise<OwnerMatch | null> {
  const user = await requireUser();
  if (!isValidPhone(phone)) return null;
  const customer = await prisma.customer.findUnique({
    where: { businessId_phone: { businessId: user.businessId, phone: normalizePhone(phone) } },
    include: {
      pets: {
        orderBy: { createdAt: "asc" },
        include: {
          workOrders: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, number: true, stage: true, createdAt: true, items: { select: { name: true, kind: true, details: true } } },
          },
          _count: { select: { workOrders: { where: { stage: { not: "CANCELLED" } } } } },
        },
      },
    },
  });
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    notes: customer.notes,
    pets: customer.pets.map((pet) => {
      const last = pet.workOrders[0];
      const open = last && !["DELIVERED", "CANCELLED"].includes(last.stage) ? last : null;
      return {
        petId: pet.id,
        name: pet.name,
        breed: pet.breed,
        color: pet.color,
        size: pet.size,
        birthYear: pet.birthYear,
        temperament: pet.temperament,
        allergies: pet.allergies,
        vaccineDue: pet.vaccineDue?.toISOString().slice(0, 10) ?? null,
        visits: pet._count.workOrders,
        // What was done last time, cut and shampoo included: "the same as before" is the usual order
        lastVisit: last
          ? {
              date: last.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }),
              summary: last.items
                .map((i) => {
                  const detail = detailSummary(i.kind as ServiceKind, i.details as ItemDetails | null);
                  return detail ? `${i.name} (${detail})` : i.name;
                })
                .join(", "),
            }
          : null,
        openOrder: open ? { id: open.id, number: open.number } : null,
      };
    }),
  };
}

const intakeSchema = z.object({
  petId: z.string().optional(),
  petName: z.string().trim().min(1, "Hayvanın adını yazın").max(40),
  breed: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
  birthYear: z.number().int().min(1990).max(2100).optional(),
  size: z.nativeEnum(PetSize),
  temperament: z.nativeEnum(Temperament),
  allergies: z.string().trim().max(500).optional(),
  vaccineDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  customerName: z.string().trim().min(2, "Müşterinin adını yazın").max(80),
  customerPhone: z.string().refine(isValidPhone, "Telefonu 05XX XXX XX XX biçiminde yazın"),
  weightKg: z.number().min(0.1).max(200).optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string(),
        price: z.number().min(0).max(10_000_000),
        details: z.unknown().optional(),
        packageName: z.string().trim().max(80).optional(),
      })
    )
    .min(1, "En az bir hizmet seçin"),
  promisedAt: z.string().datetime({ offset: true }).optional(),
  stationId: z.string().optional(),
  deposit: z.number().min(0).max(10_000_000).optional(),
  depositMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export async function createWorkOrder(
  input: IntakeInput
): Promise<{ error: string } | { id: string; number: string; trackingToken: string }> {
  const user = await requireUser();
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const businessId = user.businessId;

  if (planOf(user.business).level === "RESTRICTED") {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const used = await prisma.workOrder.count({ where: { businessId, createdAt: { gte: since } } });
    if (used >= RESTRICTED_ORDERS_PER_30_DAYS) {
      return { error: `Kısıtlı modda 30 günde en fazla ${RESTRICTED_ORDERS_PER_30_DAYS} kabul açılabilir. Tam kullanım için bize yazın.` };
    }
  }
  const phone = normalizePhone(d.customerPhone);

  // Everything the client sent by id must belong to this business
  const [services, multiplier, station, packages] = await Promise.all([
    prisma.service.findMany({ where: { businessId, id: { in: d.items.map((i) => i.serviceId) } } }),
    prisma.sizeMultiplier.findUnique({ where: { businessId_size: { businessId, size: d.size } } }),
    d.stationId ? prisma.station.findFirst({ where: { id: d.stationId, businessId } }) : null,
    prisma.servicePackage.findMany({ where: { businessId }, select: { name: true } }),
  ]);
  const packageNames = new Set(packages.map((p) => p.name));
  if (services.length !== new Set(d.items.map((i) => i.serviceId)).size) return { error: "Seçilen hizmetlerden biri bulunamadı" };
  if (d.stationId && !station) return { error: "İstasyon bulunamadı" };
  const factor = Number(multiplier?.multiplier ?? 1);

  let items;
  try {
    items = d.items.map((i) => {
    const s = services.find((x) => x.id === i.serviceId)!;
    const details = parseDetails(s.kind, i.details);
    return {
      serviceId: s.id,
      name: s.name,
      kind: s.kind,
      details: details ?? Prisma.DbNull,
      packageName: i.packageName && packageNames.has(i.packageName) ? i.packageName : null,
      basePrice: s.basePrice,
      multiplier: factor,
      quantity: 1,
      // The price list gives the starting point; the salon may agree another price at the counter
      totalPrice: new Prisma.Decimal(Math.round(i.price * 100) / 100),
      listPrice: sizePrice(Number(s.basePrice), factor),
    };
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Hizmet ayrıntıları geçersiz" };
  }
  const total = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const deposit = Math.min(d.deposit ?? 0, total);

  const order = await prisma.$transaction(async (tx) => {
    // The customer is the phone number; a known number keeps its record (name updated)
    const customer = await tx.customer.upsert({
      where: { businessId_phone: { businessId, phone } },
      update: { name: d.customerName },
      create: { businessId, phone, name: d.customerName },
    });
    const petData = {
      name: d.petName,
      breed: d.breed || null,
      color: d.color || null,
      birthYear: d.birthYear ?? null,
      size: d.size,
      temperament: d.temperament,
      allergies: d.allergies || null,
      vaccineDue: d.vaccineDue ? new Date(`${d.vaccineDue}T12:00:00+03:00`) : null,
    };
    // A chosen pet must belong to this owner; otherwise the name finds or creates it
    const known = d.petId ? await tx.pet.findFirst({ where: { id: d.petId, customerId: customer.id }, select: { id: true } }) : null;
    const pet = known
      ? await tx.pet.update({ where: { id: known.id }, data: petData })
      : await tx.pet.upsert({
          where: { customerId_name: { customerId: customer.id, name: d.petName } },
          update: petData,
          create: { businessId, customerId: customer.id, ...petData },
        });

    let number = newWorkOrderNumber();
    while (await tx.workOrder.findUnique({ where: { number }, select: { id: true } })) number = newWorkOrderNumber();

    const created = await tx.workOrder.create({
      data: {
        businessId,
        number,
        trackingToken: newTrackingToken(),
        customerId: customer.id,
        petId: pet.id,
        stationId: station?.id ?? null,
        weightKg: d.weightKg ?? null,
        promisedAt: d.promisedAt ? new Date(d.promisedAt) : null,
        totalAmount: total,
        notes: d.notes || null,
        createdById: user.id,
        items: { create: items.map(({ listPrice: _l, ...i }) => i) },
        events: { create: { stage: "RECEIVED", note: "Teslim alındı", userId: user.id } },
        inspection: { create: { createdById: user.id } },
        ...(deposit > 0 && {
          payments: {
            create: { amount: deposit, method: d.depositMethod ?? "CASH", note: "Kabulde alınan kapora", createdById: user.id },
          },
        }),
      },
    });
    return created;
  });

  return { id: order.id, number: order.number, trackingToken: order.trackingToken };
}
