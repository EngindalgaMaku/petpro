"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizePhone, isValidPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export interface AppointmentResult {
  ok?: boolean;
  error?: string;
  id?: string;
}

const appointmentSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Randevu başlığını yazın").max(100),
  stationId: z.string().trim().optional(),
  startsAt: z.string().min(1, "Başlangıç saatini seçin"),
  endsAt: z.string().min(1, "Bitiş saatini seçin"),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  petName: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function saveAppointment(form: FormData): Promise<AppointmentResult> {
  try {
    const user = await requireUser();
    const raw = Object.fromEntries(form.entries());
    const parsed = appointmentSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const d = parsed.data;
    const startsAt = new Date(d.startsAt);
    const endsAt = new Date(d.endsAt);

    if (endsAt <= startsAt) {
      return { error: "Bitiş saati başlangıç saatinden sonra olmalıdır" };
    }

    const stationId = d.stationId && d.stationId !== "" ? d.stationId : null;

    // İstasyon Çakışma Kontrolü (Conflict Prevention)
    if (stationId) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          businessId: user.businessId,
          stationId,
          status: { in: ["BOOKED", "ARRIVED"] },
          id: d.id ? { not: d.id } : undefined,
          AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
        },
        include: { station: { select: { name: true } }, pet: { select: { name: true } } },
      });

      if (conflict) {
        const timeFmt = (date: Date) =>
          date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
        return {
          error: `Çakışma: ${conflict.station?.name ?? "Bu istasyon"} ${timeFmt(conflict.startsAt)} - ${timeFmt(
            conflict.endsAt
          )} saatleri arasında dolu! (${conflict.pet?.name ?? conflict.title})`,
        };
      }
    }

    // Müşteri & Hayvan İlişkisi (Varsa bağla veya yeni aç)
    let customerId: string | null = null;
    let petId: string | null = null;

    if (d.customerPhone && isValidPhone(d.customerPhone)) {
      const phoneNorm = normalizePhone(d.customerPhone);
      let customer = await prisma.customer.findUnique({
        where: { businessId_phone: { businessId: user.businessId, phone: phoneNorm } },
      });
      if (!customer && d.customerName) {
        customer = await prisma.customer.create({
          data: {
            businessId: user.businessId,
            name: d.customerName,
            phone: phoneNorm,
          },
        });
      }
      if (customer) {
        customerId = customer.id;
        if (d.petName) {
          const pet = await prisma.pet.upsert({
            where: { customerId_name: { customerId: customer.id, name: d.petName } },
            update: {},
            create: { businessId: user.businessId, customerId: customer.id, name: d.petName },
          });
          petId = pet.id;
        }
      }
    }

    if (d.id) {
      await prisma.appointment.update({
        where: { id: d.id, businessId: user.businessId },
        data: {
          title: d.title,
          stationId,
          startsAt,
          endsAt,
          customerId,
          petId,
          notes: d.notes || null,
        },
      });
    } else {
      await prisma.appointment.create({
        data: {
          businessId: user.businessId,
          title: d.title,
          stationId,
          startsAt,
          endsAt,
          customerId,
          petId,
          notes: d.notes || null,
          status: "BOOKED",
        },
      });
    }

    revalidatePath("/randevular");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Randevu kaydedilemedi" };
  }
}

export async function setAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<AppointmentResult> {
  try {
    const user = await requireUser();
    await prisma.appointment.update({
      where: { id, businessId: user.businessId },
      data: { status },
    });
    revalidatePath("/randevular");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Durum güncellenemedi" };
  }
}

export async function deleteAppointment(id: string): Promise<AppointmentResult> {
  try {
    const user = await requireUser();
    await prisma.appointment.delete({
      where: { id, businessId: user.businessId },
    });
    revalidatePath("/randevular");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Randevu silinemedi" };
  }
}
