"use server";

import { revalidatePath } from "next/cache";
import { adminKeyMatches } from "@/lib/admin-key";
import { prisma } from "@/lib/db";

const DAY = 24 * 3600 * 1000;

/** One button on /yonetim. Real sign-ups only: the demo business is reset every night anyway */
export async function changePlan(form: FormData) {
  if (!adminKeyMatches(String(form.get("adminKey") ?? ""))) return;
  const id = String(form.get("businessId") ?? "");
  const action = String(form.get("change") ?? "");
  const now = new Date();
  const later = (from: Date | null, days: number) => new Date(Math.max(from?.getTime() ?? 0, now.getTime()) + days * DAY);
  const business = await prisma.business.findFirst({ where: { id, isDemo: false }, select: { entryEndsAt: true, paidUntil: true } });
  if (!business) return;
  const data =
    action === "entry30"
      ? { entryEndsAt: later(business.entryEndsAt, 30) }
      : action === "paid30"
        ? { paidUntil: later(business.paidUntil, 30) }
        : action === "paid365"
          ? { paidUntil: later(business.paidUntil, 365) }
          : action === "restrict"
            ? { entryEndsAt: now, paidUntil: null }
            : null;
  if (data) await prisma.business.update({ where: { id }, data });
  revalidatePath("/yonetim");
}
