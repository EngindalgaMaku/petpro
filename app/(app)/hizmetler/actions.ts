"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ServiceKind, StationType, PetSize } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseTL } from "@/lib/money";
import { canManage, requireUser } from "@/lib/session";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

async function manager() {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("Hizmet ve fiyatları yalnızca işletme sahibi ve yöneticiler değiştirebilir");
  return user;
}

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Hizmet adını yazın").max(80),
  kind: z.nativeEnum(ServiceKind),
  defaultProduct: z.string().trim().max(80).optional(),
  description: z.string().trim().max(160).optional(),
  basePrice: z.string().transform((v, ctx) => {
    const n = parseTL(v);
    if (n === null || n > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "Fiyatı rakamla yazın, örneğin 1.250" });
      return z.NEVER;
    }
    return n;
  }),
  durationMinutes: z.coerce.number().int().min(10).max(60 * 24 * 7),
  stationType: z.union([z.nativeEnum(StationType), z.literal("")]),
  reminderWeeks: z.union([z.coerce.number().int().min(1).max(36), z.literal("")]),
});

export async function saveService(form: FormData): Promise<ActionResult> {
  try {
    const user = await manager();
    const parsed = serviceSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const data = {
      name: d.name,
      kind: d.kind,
      defaultProduct: d.defaultProduct || null,
      description: d.description || null,
      basePrice: d.basePrice,
      durationMinutes: d.durationMinutes,
      stationType: d.stationType || null,
      reminderWeeks: d.reminderWeeks === "" ? null : d.reminderWeeks,
    };
    if (id) {
      const { count } = await prisma.service.updateMany({ where: { id, businessId: user.businessId }, data });
      if (!count) return { error: "Hizmet bulunamadı" };
    } else {
      const last = await prisma.service.aggregate({ where: { businessId: user.businessId }, _max: { sortOrder: true } });
      await prisma.service.create({
        data: { ...data, businessId: user.businessId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    }
    revalidatePath("/hizmetler");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}

/** Hidden from the intake list; kept because past work orders refer to it */
export async function setServiceActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const user = await manager();
    await prisma.service.updateMany({ where: { id, businessId: user.businessId }, data: { isActive } });
    revalidatePath("/hizmetler");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}

/** Deleting is only for services never used on a work order; others can be hidden */
export async function deleteService(id: string): Promise<ActionResult> {
  try {
    const user = await manager();
    const used = await prisma.workOrderItem.count({ where: { serviceId: id, workOrder: { businessId: user.businessId } } });
    if (used) return { error: "Bu hizmet iş emirlerinde kullanıldı; silmek yerine gizleyin" };
    await prisma.service.deleteMany({ where: { id, businessId: user.businessId } });
    revalidatePath("/hizmetler");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Silinemedi" };
  }
}

export async function saveMultipliers(form: FormData): Promise<ActionResult> {
  try {
    const user = await manager();
    const rows: Array<{ size: PetSize; multiplier: number }> = [];
    for (const size of Object.values(PetSize)) {
      const raw = String(form.get(size) ?? "").replace(",", ".");
      const multiplier = Number(raw);
      if (!raw || !Number.isFinite(multiplier) || multiplier < 0.1 || multiplier > 9.99) {
        return { error: "Katsayılar 0,1 ile 9,99 arasında olmalı" };
      }
      rows.push({ size, multiplier: Math.round(multiplier * 100) / 100 });
    }
    await prisma.$transaction(
      rows.map(({ size, multiplier }) =>
        prisma.sizeMultiplier.upsert({
          where: { businessId_size: { businessId: user.businessId, size } },
          update: { multiplier },
          create: { businessId: user.businessId, size, multiplier },
        })
      )
    );
    revalidatePath("/hizmetler");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}

const packageSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Paket adını yazın").max(80),
  price: z.string().transform((v, ctx) => {
    const n = parseTL(v);
    if (n === null || n <= 0 || n > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "Paket fiyatını rakamla yazın" });
      return z.NEVER;
    }
    return n;
  }),
  serviceIds: z.array(z.string()).min(2, "Pakete en az iki hizmet seçin"),
});

export async function savePackage(form: FormData): Promise<ActionResult> {
  try {
    const user = await manager();
    const parsed = packageSchema.safeParse({
      id: form.get("id") || undefined,
      name: form.get("name"),
      price: form.get("price"),
      serviceIds: form.getAll("serviceIds").map(String),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { id, name, price, serviceIds } = parsed.data;
    const owned = await prisma.service.count({ where: { businessId: user.businessId, id: { in: serviceIds } } });
    if (owned !== new Set(serviceIds).size) return { error: "Seçilen hizmetlerden biri bulunamadı" };

    await prisma.$transaction(async (tx) => {
      let packageId = id;
      if (id) {
        const { count } = await tx.servicePackage.updateMany({ where: { id, businessId: user.businessId }, data: { name, price } });
        if (!count) throw new Error("Paket bulunamadı");
        await tx.servicePackageItem.deleteMany({ where: { packageId: id } });
      } else {
        packageId = (await tx.servicePackage.create({ data: { businessId: user.businessId, name, price } })).id;
      }
      await tx.servicePackageItem.createMany({ data: [...new Set(serviceIds)].map((serviceId) => ({ packageId: packageId!, serviceId })) });
    });
    revalidatePath("/hizmetler");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}

export async function deletePackage(id: string): Promise<ActionResult> {
  try {
    const user = await manager();
    // Past work orders keep the package name on their items, so a package can always go
    await prisma.servicePackage.deleteMany({ where: { id, businessId: user.businessId } });
    revalidatePath("/hizmetler");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Silinemedi" };
  }
}
