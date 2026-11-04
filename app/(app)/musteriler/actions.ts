"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export async function updateCustomer(
  id: string,
  data: { name: string; phone: string; notes: string; marketingConsent: boolean }
): Promise<{ ok?: boolean; error?: string }> {
  const user = await requireUser();
  const name = data.name.trim();
  if (name.length < 2 || name.length > 80) return { error: "Adı yazın" };
  if (!isValidPhone(data.phone)) return { error: "Telefonu 05XX XXX XX XX biçiminde yazın" };
  const phone = normalizePhone(data.phone);

  const clash = await prisma.customer.findFirst({
    where: { businessId: user.businessId, phone, id: { not: id } },
    select: { name: true },
  });
  if (clash) return { error: `Bu telefon ${clash.name} adına kayıtlı` };

  const { count } = await prisma.customer.updateMany({
    where: { id, businessId: user.businessId },
    data: { name, phone, notes: data.notes.trim().slice(0, 1000) || null, marketingConsent: data.marketingConsent },
  });
  if (!count) return { error: "Müşteri bulunamadı" };
  revalidatePath(`/musteriler/${id}`);
  revalidatePath("/musteriler");
  return { ok: true };
}
