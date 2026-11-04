"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

/**
 * The customer confirms the intake record from the tracking link. Only the first confirmation
 * counts; from then on the salon cannot add or delete marks.
 */
export async function approveInspection(token: string): Promise<{ ok?: boolean; error?: string }> {
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(token)) return { error: "Bağlantı geçersiz" };
  const order = await prisma.workOrder.findUnique({ where: { trackingToken: token }, select: { id: true, inspection: { select: { id: true } } } });
  if (!order?.inspection) return { error: "Kayıt bulunamadı" };
  await prisma.inspection.updateMany({
    where: { id: order.inspection.id, customerApprovedAt: null },
    data: { customerApprovedAt: new Date(), approvalChannel: "LINK" },
  });
  revalidatePath(`/t/${token}`);
  return { ok: true };
}
