import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui";
import { cashReport, type Period } from "@/lib/cash-report";
import { prisma } from "@/lib/db";
import { expenseLabel, METHOD_LABELS } from "@/lib/expenses";
import { formatTL } from "@/lib/money";
import { canManage, requireUser } from "@/lib/session";
import { addDays, dayKeyTR, parseDayTR, startOfDayTR } from "@/lib/turkey-time";
import { cn } from "@/lib/utils";
import { DeleteExpense, ExpenseForm } from "./expense-form";

export const metadata = { title: "Kasa" };
export const dynamic = "force-dynamic";

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "gun", label: "Gün" },
  { id: "ay", label: "Ay" },
  { id: "yil", label: "Yıl" },
];

const tz = { timeZone: "Europe/Istanbul" } as const;
const time = (iso: string) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", ...tz });

function periodTitle(period: Period, key: string) {
  if (period === "yil") return key;
  if (period === "ay") return parseDayTR(`${key}-01`)!.toLocaleDateString("tr-TR", { month: "long", year: "numeric", ...tz });
  return parseDayTR(key)!.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric", ...tz });
}

function shift(period: Period, key: string, by: number) {
  if (period === "gun") return dayKeyTR(addDays(parseDayTR(key)!, by));
  if (period === "yil") return String(Number(key) + by);
  const [y, m] = key.split("-").map(Number);
  const i = y * 12 + (m - 1) + by;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

const seriesLabel = (period: Period, key: string) =>
  period === "ay" ? String(Number(key.slice(8))) : parseDayTR(`${key}-01`)!.toLocaleDateString("tr-TR", { month: "short", ...tz });

export default async function CashPage({ searchParams }: { searchParams: Promise<{ donem?: string; tarih?: string }> }) {
  const user = await requireUser();
  const today = dayKeyTR(new Date());

  // Staff log what they spend; the money picture is for the owner and managers
  if (!canManage(user.role)) {
    const mine = await prisma.expense.findMany({
      where: { businessId: user.businessId, createdById: user.id, spentAt: { gte: startOfDayTR() } },
      orderBy: { spentAt: "desc" },
    });
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 pt-6 md:px-8">
        <h1 className="font-display text-[28px] font-bold">Kasa</h1>
        <ExpenseForm today={today} />
        {mine.length > 0 && (
          <Card className="overflow-hidden">
            <Eyebrow className="px-4 pt-4">Bugün girdiğiniz giderler</Eyebrow>
            <ul className="mt-2 divide-y divide-line">
              {mine.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {expenseLabel(e.category)}
                    {e.description && <span className="text-muted"> · {e.description}</span>}
                  </span>
                  <span className="shrink-0 font-display font-semibold tabular-nums text-danger">−{formatTL(e.amount)}</span>
                  <DeleteExpense id={e.id} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  const sp = await searchParams;
  const period: Period = sp.donem === "ay" || sp.donem === "yil" ? sp.donem : "gun";
  const r = await cashReport(user.businessId, period, sp.tarih);
  const href = (p: Period, k: string) => `/kasa?donem=${p}&tarih=${k}`;
  const next = shift(period, r.key, 1);
  const hasNext = next <= (period === "gun" ? today : period === "ay" ? today.slice(0, 7) : today.slice(0, 4));
  const peak = Math.max(1, ...(r.series ?? []).map((s) => Math.max(s.income, s.expense)));
  const groomers = Object.entries(r.byGroomer).sort((a, b) => b[1].turnover - a[1].turnover);
  const categories = Object.entries(r.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold">Kasa</h1>
        <nav aria-label="Dönem" className="flex rounded-xl border border-line bg-sunken p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/kasa?donem=${p.id}`}
              aria-current={p.id === period ? "page" : undefined}
              className={cn(
                "grid h-10 min-w-16 place-items-center rounded-lg px-3 text-sm font-medium",
                p.id === period ? "bg-accent text-accent-ink" : "text-muted hover:text-ink",
              )}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex items-center justify-between gap-2">
        <Link href={href(period, shift(period, r.key, -1))} aria-label="Önceki" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-raised">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <p className="text-center font-medium first-letter:uppercase" data-testid="period-title">
          {periodTitle(period, r.key)}
        </p>
        {hasNext ? (
          <Link href={href(period, next)} aria-label="Sonraki" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-raised">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : (
          <span className="h-11 w-11 shrink-0" />
        )}
      </div>

      <section aria-label="Özet" className="grid grid-cols-3 gap-2">
        {[
          { id: "income", label: "Gelir", value: r.income, cls: "text-ready" },
          { id: "expense", label: "Gider", value: r.expense, cls: "text-danger" },
          { id: "net", label: "Net", value: r.net, cls: r.net < 0 ? "text-danger" : "" },
        ].map((s) => (
          <Card key={s.id} className="p-3">
            <p data-testid={`total-${s.id}`} className={cn("truncate font-display text-lg font-bold tabular-nums sm:text-2xl", s.cls)}>
              {formatTL(s.value)}
            </p>
            <p className="text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </section>

      <p className="text-sm text-muted">
        {r.opened} iş açıldı · {r.delivered} hayvan teslim edildi
      </p>

      {r.series && (
        <Card className="p-4">
          <Eyebrow>{period === "ay" ? "Günlere göre" : "Aylara göre"}</Eyebrow>
          <div className="mt-3 flex h-36 items-end gap-0.5 sm:gap-1">
            {r.series.map((s) => (
              <Link
                key={s.key}
                href={href(period === "ay" ? "gun" : "ay", s.key)}
                title={`Gelir ${formatTL(s.income)}, gider ${formatTL(s.expense)}`}
                className="group flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <span className="flex flex-1 items-end justify-center gap-px">
                  <span className="w-1/2 rounded-t bg-ready/80 group-hover:bg-ready" style={{ height: `${(s.income / peak) * 100}%` }} />
                  <span className="w-1/2 rounded-t bg-danger/70 group-hover:bg-danger" style={{ height: `${(s.expense / peak) * 100}%` }} />
                </span>
                <span className="mt-1 truncate text-center text-[10px] text-muted">{seriesLabel(period, s.key)}</span>
              </Link>
            ))}
          </div>
          <p className="mt-2 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-ready" /> Gelir
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-danger" /> Gider
            </span>
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <Eyebrow>Tahsilat şekli</Eyebrow>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.keys(METHOD_LABELS).map((m) => (
              <li key={m} className="flex justify-between gap-3">
                <span>{METHOD_LABELS[m]}</span>
                <span className="tabular-nums">{formatTL(r.byMethod[m] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <Eyebrow>Gider türleri</Eyebrow>
          {categories.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Gider yok.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm" data-testid="categories">
              {categories.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="truncate">{expenseLabel(k)}</span>
                  <span className="shrink-0 tabular-nums">{formatTL(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <Eyebrow>Kuaförler</Eyebrow>
        <p className="mt-1 text-xs text-muted">Bu dönemde teslim edilen işlerin tutarı, işe atanan kuaföre göre.</p>
        {groomers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Teslim edilen iş yok.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {groomers.map(([name, t]) => (
              <li key={name} className="flex justify-between gap-3">
                <span className="truncate">
                  {name} <span className="text-muted">· {t.orders} iş</span>
                </span>
                <span className="shrink-0 tabular-nums">{formatTL(t.turnover)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {period === "gun" && (
        <Card className="overflow-hidden">
          <Eyebrow className="px-4 pt-4">Hareketler</Eyebrow>
          {r.movements.length === 0 ? (
            <p className="p-4 text-sm text-muted">Bu gün hareket yok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line" data-testid="movements">
              {r.movements.map((m) => {
                const body = (
                  <>
                    <span className="w-12 shrink-0 text-sm tabular-nums text-muted">{time(m.at)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{m.type === "out" ? expenseLabel(m.title) : m.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {[m.detail, m.method && METHOD_LABELS[m.method]].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className={cn("shrink-0 font-display font-semibold tabular-nums", m.type === "in" ? "text-ready" : "text-danger")}>
                      {m.type === "in" ? "+" : "−"}
                      {formatTL(m.amount)}
                    </span>
                  </>
                );
                return (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-2">
                    {m.href ? (
                      <Link href={m.href} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 hover:text-accent-strong">
                        {body}
                      </Link>
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-3">{body}</span>
                    )}
                    {m.type === "out" ? <DeleteExpense id={m.id} /> : <span className="w-11 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <ExpenseForm today={today} />
    </div>
  );
}
