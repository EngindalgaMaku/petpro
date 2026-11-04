"use server";

import { revalidatePath } from "next/cache";
import { ConditionKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { removePhoto } from "@/lib/photos";
import { requireUser } from "@/lib/session";
import { isPart, partCenter } from "@/lib/pet-parts";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  id?: string;
}

/** The work order's intake record (created at intake; older orders get one on first use) */
async function inspectionFor(orderId: string) {
  const user = await requireUser();
  const order = await prisma.workOrder.findFirst({ where: { id: orderId, businessId: user.businessId }, select: { id: true } });
  if (!order) return null;
  const inspection = await prisma.inspection.upsert({
    where: { workOrderId: orderId },
    update: {},
    create: { workOrderId: orderId, createdById: user.id },
  });
  return { user, inspection };
}

const refresh = (orderId: string) => {
  revalidatePath(`/is/${orderId}`);
  revalidatePath(`/is/${orderId}/kayit`);
};

export async function addMark(orderId: string, part: string, kind: ConditionKind, note: string): Promise<ActionResult> {
  const ctx = await inspectionFor(orderId);
  if (!ctx) return { error: "İş emri bulunamadı" };
  if (!isPart(part)) return { error: "Bölge bulunamadı" };
  if (!Object.values(ConditionKind).includes(kind)) return { error: "Geçersiz işaret türü" };
  if (ctx.inspection.customerApprovedAt) return { error: "Müşteri kaydı onayladı; yeni işaret eklenemez" };

  const last = await prisma.conditionMark.aggregate({ where: { inspectionId: ctx.inspection.id }, _max: { number: true } });
  const c = partCenter(part);
  const mark = await prisma.conditionMark.create({
    data: {
      inspectionId: ctx.inspection.id,
      number: (last._max.number ?? 0) + 1,
      part,
      kind,
      note: note.trim().slice(0, 200) || null,
      x: c.x,
      y: c.y,
    },
  });
  refresh(orderId);
  return { ok: true, id: mark.id };
}

export async function deleteMark(orderId: string, markId: string): Promise<ActionResult> {
  const ctx = await inspectionFor(orderId);
  if (!ctx) return { error: "İş emri bulunamadı" };
  if (ctx.inspection.customerApprovedAt) return { error: "Müşteri kaydı onayladı; işaret silinemez" };
  const photos = await prisma.photo.findMany({ where: { conditionMarkId: markId, workOrderId: orderId } });
  await prisma.$transaction([
    prisma.photo.deleteMany({ where: { conditionMarkId: markId, workOrderId: orderId } }),
    prisma.conditionMark.deleteMany({ where: { id: markId, inspectionId: ctx.inspection.id } }),
  ]);
  await Promise.all(photos.map((p) => removePhoto(p.path).catch(() => {})));
  refresh(orderId);
  return { ok: true };
}

export async function deletePhoto(orderId: string, photoId: string): Promise<ActionResult> {
  const ctx = await inspectionFor(orderId);
  if (!ctx) return { error: "İş emri bulunamadı" };
  const photo = await prisma.photo.findFirst({ where: { id: photoId, workOrderId: orderId } });
  if (!photo) return { error: "Fotoğraf bulunamadı" };
  if (photo.kind === "CONDITION" && ctx.inspection.customerApprovedAt) return { error: "Müşteri kaydı onayladı; kabul fotoğrafı silinemez" };
  await prisma.photo.delete({ where: { id: photoId } });
  await removePhoto(photo.path).catch(() => {});
  refresh(orderId);
  return { ok: true };
}
