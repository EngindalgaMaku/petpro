"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, WorkStage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseTL } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { canMove, STAGES } from "@/lib/stages";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

async function ownOrder(id: string) {
  const user = await requireUser();
  const order = await prisma.workOrder.findFirst({
    where: { id, businessId: user.businessId },
    include: { items: { select: { serviceId: true, name: true, service: { select: { name: true, reminderWeeks: true } } } } },
  });
  return { user, order };
}

function refresh(id: string) {
  revalidatePath(`/is/${id}`);
  revalidatePath("/salon");
  revalidatePath("/bugun");
}

export async function moveStage(id: string, target: WorkStage, note?: string): Promise<ActionResult> {
  const { user, order } = await ownOrder(id);
  if (!order) return { error: "İş emri bulunamadı" };
  if (!canMove(order.stage, target)) {
    return { error: `${STAGES[order.stage].label} aşamasından ${STAGES[target].label} aşamasına geçilemez` };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id },
      data: { stage: target, ...(target === "DELIVERED" && { deliveredAt: now }) },
    });
    await tx.workOrderEvent.create({
      data: { workOrderId: id, stage: target, note: note?.trim().slice(0, 500) || null, userId: user.id },
    });

    // Handing the pet over starts the bring-back clock of services that have one (the salon
    // sets the weeks per service); never twice for the same order
    if (target === "DELIVERED") {
      const already = await tx.reminder.count({ where: { sourceWorkOrderId: id } });
      if (!already) {
        const due = order.items.filter((i) => i.service?.reminderWeeks);
        if (due.length) {
          await tx.reminder.createMany({
            data: due.map((i) => ({
              businessId: order.businessId,
              customerId: order.customerId,
              petId: order.petId,
              title: `${i.service!.name} zamanı`,
              dueAt: new Date(now.getTime() + i.service!.reminderWeeks! * 7 * 864e5),
              sourceWorkOrderId: id,
            })),
          });
        }
      }
    }
  });
  refresh(id);
  return { ok: true };
}

export async function assignWork(id: string, field: "groomerId" | "stationId", value: string): Promise<ActionResult> {
  const { user, order } = await ownOrder(id);
  if (!order) return { error: "İş emri bulunamadı" };
  if (value) {
    const exists =
      field === "groomerId"
        ? await prisma.user.count({ where: { id: value, businessId: user.businessId, isActive: true } })
        : await prisma.station.count({ where: { id: value, businessId: user.businessId } });
    if (!exists) return { error: "Seçim bulunamadı" };
  }
  await prisma.workOrder.update({ where: { id }, data: { [field]: value || null } });
  refresh(id);
  return { ok: true };
}

export async function addPayment(id: string, amountText: string, method: PaymentMethod): Promise<ActionResult> {
  const { user, order } = await ownOrder(id);
  if (!order) return { error: "İş emri bulunamadı" };
  if (!Object.values(PaymentMethod).includes(method)) return { error: "Geçersiz ödeme şekli" };
  const amount = parseTL(amountText);
  if (amount === null || amount <= 0) return { error: "Tutarı rakamla yazın" };

  const paid = await prisma.payment.aggregate({ where: { workOrderId: id }, _sum: { amount: true } });
  const remaining = Number(order.totalAmount) - Number(paid._sum.amount ?? 0);
  if (amount > remaining + 0.01) return { error: `Kalan tutardan fazla (${remaining.toLocaleString("tr-TR")} ₺)` };

  await prisma.payment.create({ data: { workOrderId: id, amount, method, createdById: user.id } });
  refresh(id);
  return { ok: true };
}

export async function deletePayment(orderId: string, paymentId: string): Promise<ActionResult> {
  const { order } = await ownOrder(orderId);
  if (!order) return { error: "İş emri bulunamadı" };
  await prisma.payment.deleteMany({ where: { id: paymentId, workOrderId: orderId } });
  refresh(orderId);
  return { ok: true };
}

/** Bugün: "Arayıp hatırlatın" handled (sent or not wanted) */
export async function closeReminder(id: string, status: "SENT" | "DISMISSED"): Promise<ActionResult> {
  const user = await requireUser();
  await prisma.reminder.updateMany({
    where: { id, businessId: user.businessId },
    data: { status, ...(status === "SENT" && { sentAt: new Date() }) },
  });
  revalidatePath("/bugun");
  return { ok: true };
}

