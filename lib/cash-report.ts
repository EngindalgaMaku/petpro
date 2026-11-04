import "server-only";
import { prisma } from "@/lib/db";
import { addDays, dayKeyTR, monthKeyTR, parseDayTR, startOfDayTR } from "@/lib/turkey-time";

export type Period = "gun" | "ay" | "yil";

const round = (n: number) => Math.round(n * 100) / 100;

/** The period's start, end (exclusive) and series bucket, from ?donem and ?tarih */
export function periodRange(period: Period, value: string | undefined) {
  const today = dayKeyTR(new Date());
  if (period === "gun") {
    const day = value && parseDayTR(value) ? value : today;
    const start = parseDayTR(day)!;
    return { key: day, start, end: addDays(start, 1), bucket: null as null | ((d: Date) => string) };
  }
  if (period === "ay") {
    const month = value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    return { key: month, start: parseDayTR(`${month}-01`)!, end: parseDayTR(next)!, bucket: dayKeyTR };
  }
  const year = value && /^\d{4}$/.test(value) ? value : today.slice(0, 4);
  return { key: year, start: parseDayTR(`${year}-01-01`)!, end: parseDayTR(`${Number(year) + 1}-01-01`)!, bucket: monthKeyTR };
}

/**
 * Money in (payments taken), money out (expenses), the net, and the period's work: orders
 * opened and handed over, and turnover per groomer (delivered orders they were on).
 */
export async function cashReport(businessId: string, period: Period, value?: string) {
  const { key, start, end, bucket } = periodRange(period, value);
  const range = { gte: start, lt: end };

  const [payments, expenses, opened, delivered] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: range, workOrder: { businessId } },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        workOrder: { select: { id: true, number: true, pet: { select: { name: true } }, customer: { select: { name: true } } } },
      },
    }),
    prisma.expense.findMany({ where: { businessId, spentAt: range }, orderBy: { spentAt: "desc" } }),
    prisma.workOrder.count({ where: { businessId, createdAt: range, stage: { not: "CANCELLED" } } }),
    prisma.workOrder.findMany({
      where: { businessId, stage: "DELIVERED", deliveredAt: range },
      select: { totalAmount: true, groomer: { select: { name: true } } },
    }),
  ]);

  const income = payments.reduce((s, p) => s + Number(p.amount), 0);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const byMethod: Record<string, number> = {};
  for (const p of payments) byMethod[p.method] = round((byMethod[p.method] ?? 0) + Number(p.amount));
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = round((byCategory[e.category] ?? 0) + Number(e.amount));

  const byGroomer: Record<string, { orders: number; turnover: number }> = {};
  for (const o of delivered) {
    const name = o.groomer?.name ?? "Kuaför atanmamış";
    const t = (byGroomer[name] ??= { orders: 0, turnover: 0 });
    t.orders += 1;
    t.turnover = round(t.turnover + Number(o.totalAmount));
  }

  let series: Array<{ key: string; income: number; expense: number }> | null = null;
  if (bucket) {
    const map = new Map<string, { income: number; expense: number }>();
    for (let d = start; d < end; d = addDays(d, 1)) if (!map.has(bucket(d))) map.set(bucket(d), { income: 0, expense: 0 });
    for (const p of payments) map.get(bucket(p.paidAt))!.income += Number(p.amount);
    for (const e of expenses) map.get(bucket(e.spentAt))!.expense += Number(e.amount);
    series = [...map.entries()].map(([k, v]) => ({ key: k, income: round(v.income), expense: round(v.expense) }));
  }

  const now = startOfDayTR();
  return {
    period,
    key,
    isCurrent: start <= now && now < end,
    income: round(income),
    expense: round(spent),
    net: round(income - spent),
    opened,
    delivered: delivered.length,
    byMethod,
    byCategory,
    byGroomer,
    series,
    movements:
      period === "gun"
        ? [
            ...payments.map((p) => ({
              id: p.id,
              type: "in" as const,
              at: p.paidAt.toISOString(),
              title: p.workOrder.customer.name,
              detail: `${p.workOrder.pet.name} · ${p.workOrder.number}`,
              href: `/is/${p.workOrder.id}`,
              method: p.method,
              amount: Number(p.amount),
            })),
            ...expenses.map((e) => ({
              id: e.id,
              type: "out" as const,
              at: e.spentAt.toISOString(),
              title: e.category,
              detail: e.description ?? "",
              href: null,
              method: e.method ?? null,
              amount: Number(e.amount),
            })),
          ].sort((a, b) => b.at.localeCompare(a.at))
        : [],
  };
}

export type CashReport = Awaited<ReturnType<typeof cashReport>>;
