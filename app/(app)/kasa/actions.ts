"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isExpenseCategory } from "@/lib/expenses";
import { parseTL } from "@/lib/money";
import { canManage, requireUser } from "@/lib/session";
import { parseDayTR, startOfDayTR } from "@/lib/turkey-time";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

export async function addExpense(input: {
  amount: string;
  category: string;
  method: string;
  date: string;
  description: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const amount = parseTL(input.amount);
  if (amount === null || amount <= 0 || amount > 10_000_000) return { error: "Tutarı rakamla yazın" };
  if (!isExpenseCategory(input.category)) return { error: "Gider türünü seçin" };
  if (!(Object.values(PaymentMethod) as string[]).includes(input.method)) return { error: "Ödeme şeklini seçin" };
  const day = parseDayTR(input.date);
  if (!day || day > startOfDayTR()) return { error: "Tarih geçersiz" };
  // A past day is stored at noon so it never slides into the day before or after
  const spentAt = day.getTime() === startOfDayTR().getTime() ? new Date() : new Date(day.getTime() + 12 * 3600 * 1000);

  await prisma.expense.create({
    data: {
      businessId: user.businessId,
      amount,
      category: input.category,
      method: input.method as PaymentMethod,
      spentAt,
      description: input.description.trim().slice(0, 300) || null,
      createdById: user.id,
    },
  });
  revalidatePath("/kasa");
  return { ok: true };
}

/** Staff can take back their own entry; the owner and managers any entry */
export async function deleteExpense(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const expense = await prisma.expense.findFirst({ where: { id, businessId: user.businessId } });
  if (!expense) return { error: "Gider bulunamadı" };
  if (!canManage(user.role) && expense.createdById !== user.id) return { error: "Bu gideri silme yetkiniz yok" };
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/kasa");
  return { ok: true };
}
