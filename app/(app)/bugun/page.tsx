import Link from "next/link";
import {
  CalendarDays,
  PawPrint,
  CheckCircle2,
  Clock,
  Coins,
  LogOut,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { PetTag } from "@/components/pet-tag";
import { Badge, buttonStyles, Card, Eyebrow } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { whatsappNumber } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { addDays, startOfDayTR } from "@/lib/turkey-time";
import { signOut } from "../../(auth)/actions";
import { ReminderActions } from "./reminder-actions";
import { TodayAnalyticsCharts } from "./today-analytics-charts";
import { QuickActionsRibbon } from "./quick-actions";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Bugün · Yönetici Paneli" };
export const dynamic = "force-dynamic";

const time = (d: Date) =>
  d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

export default async function TodayPage() {
  const user = await requireUser();
  const businessId = user.businessId;
  const today = startOfDayTR();
  const tomorrow = addDays(today, 1);
  const sevenDaysAgo = addDays(today, -6);

  const [
    inside,
    ready,
    requestCount,
    appointments,
    reminders,
    unpricedServices,
    todayPaymentsAgg,
    activeOrders,
    recentOrders,
    activeItems,
  ] = await Promise.all([
    prisma.workOrder.count({
      where: { businessId, stage: { notIn: ["DELIVERED", "CANCELLED"] } },
    }),
    prisma.workOrder.count({ where: { businessId, stage: "READY" } }),
    prisma.appointment.count({ where: { businessId, status: "REQUESTED", startsAt: { gte: new Date() } } }),
    prisma.appointment.findMany({
      where: {
        businessId,
        startsAt: { gte: today, lt: tomorrow },
        status: { in: ["BOOKED", "ARRIVED"] },
      },
      orderBy: { startsAt: "asc" },
      include: {
        pet: { select: { name: true, breed: true, size: true } },
        station: { select: { name: true } },
      },
    }),
    prisma.reminder.findMany({
      where: { businessId, status: "PENDING", dueAt: { lt: addDays(today, 8) } },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: {
        customer: { select: { name: true, phone: true } },
        pet: { select: { name: true, size: true } },
      },
    }),
    prisma.service.count({
      where: { businessId, isActive: true, basePrice: 0 },
    }),
    prisma.payment.aggregate({
      where: {
        workOrder: { businessId },
        paidAt: { gte: today, lt: tomorrow },
      },
      _sum: { amount: true },
    }),
    prisma.workOrder.findMany({
      where: { businessId, stage: { notIn: ["CANCELLED", "DELIVERED"] } },
      select: { totalAmount: true, payments: { select: { amount: true } } },
    }),
    prisma.workOrder.findMany({
      where: { businessId, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.workOrderItem.findMany({
      where: {
        workOrder: {
          businessId,
          stage: { notIn: ["CANCELLED", "DELIVERED"] },
        },
      },
      select: { kind: true, name: true },
    }),
  ]);

  const todayCollected = Number(todayPaymentsAgg._sum.amount || 0);

  const unpaidTotal = activeOrders.reduce((sum, o) => {
    const paid = o.payments.reduce((pSum, p) => pSum + Number(p.amount), 0);
    return sum + Math.max(0, Number(o.totalAmount) - paid);
  }, 0);

  // Weekly data aggregation
  const days = ["Pzr", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const weeklyMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(sevenDaysAgo, i);
    weeklyMap.set(days[d.getDay()], 0);
  }
  recentOrders.forEach((o) => {
    const key = days[new Date(o.createdAt).getDay()];
    if (weeklyMap.has(key)) {
      weeklyMap.set(key, (weeklyMap.get(key) || 0) + 1);
    }
  });
  const weeklyData = Array.from(weeklyMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));

  // Service distribution
  const kindLabels: Record<string, { label: string; color: string }> = {
    BATH: { label: "Yıkama", color: "#38bdf8" },
    HAIRCUT: { label: "Tıraş", color: "#a78bfa" },
    DEMATTING: { label: "Keçe açma", color: "#fb923c" },
    NAILS: { label: "Tırnak", color: "#ffb020" },
    EARS: { label: "Kulak", color: "#34d399" },
    TEETH: { label: "Diş", color: "#f43f5e" },
    PARASITE: { label: "Pire ve kene", color: "#94a3b8" },
    OTHER: { label: "Diğer", color: "#64748b" },
  };
  const counts: Record<string, number> = {};
  activeItems.forEach((i) => {
    const k = i.kind || "OTHER";
    counts[k] = (counts[k] || 0) + 1;
  });
  const serviceDistribution = Object.entries(counts).map(([k, count]) => ({
    name: kindLabels[k]?.label || k,
    value: count,
    color: kindLabels[k]?.color || "#ffb020",
  }));

  const nextIndex = appointments.findIndex(
    (a) => a.status === "BOOKED" && a.startsAt >= new Date()
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 md:px-8">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-ready" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {user.business.name} · Pet Kuaförü
            </p>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl text-ink">
            Bugün
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            {new Date().toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Europe/Istanbul",
            })}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <QuickActionsRibbon />
          {/* On a phone these two already sit in the top bar and the menu */}
          <span className="hidden lg:contents">
            <ThemeToggle />
          </span>
          <form action={signOut} className="hidden lg:block">
            <button
              type="submit"
              aria-label="Çıkış yap"
              title="Çıkış yap"
              className={buttonStyles({ variant: "secondary", size: "icon-sm" })}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      {/* Unpriced warning */}
      {requestCount > 0 && (
        <Card className="flex items-center justify-between gap-4 border-accent/60 bg-accent/10 p-4" data-testid="request-alert">
          <p className="text-sm font-semibold text-ink">{requestCount} online randevu talebi onay bekliyor.</p>
          <Link href="/randevular" className={buttonStyles({ size: "sm", className: "shrink-0 whitespace-nowrap" })}>
            Talepleri Gör
          </Link>
        </Card>
      )}

      {unpricedServices > 0 && (
        <Card className="flex items-center justify-between gap-4 border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-400 font-bold">
              !
            </span>
            <p className="text-xs sm:text-sm text-ink">
              <span className="font-semibold text-amber-800 dark:text-amber-400">
                {unpricedServices} hizmetin fiyatı girilmedi.
              </span>{" "}
              <span className="text-muted">Kabulde fiyatlar bu listeden gelir.</span>
            </p>
          </div>
          <Link
            href="/hizmetler"
            className={buttonStyles({
              size: "sm",
              className: "shrink-0 whitespace-nowrap",
            })}
          >
            Fiyatları Gir
          </Link>
        </Card>
      )}

      {/* Primary KPI Metrics Grid */}
      <section
        aria-label="İşletme Metrikleri"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <Link href="/salon" className="group">
          <Card className="p-4 transition-all hover:border-line-strong hover:bg-raised/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">İçerideki Hayvanlar</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-raised text-muted group-hover:text-accent-strong">
                <PawPrint className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-ink">
                {inside}
              </p>
              <Badge variant="outline" className="text-[11px]">
                Salonda
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted truncate">Şu an salonda olanlar</p>
          </Card>
        </Link>

        <Link href="/salon?asama=READY" className="group">
          <Card className="p-4 transition-all hover:border-ready/50 hover:bg-ready/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ready">Teslime Hazır</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ready/15 text-ready">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-ready">
                {ready}
              </p>
              <Badge variant="success" className="text-[11px]">
                Hazır
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted truncate">Müşteri teslimi bekliyor</p>
          </Card>
        </Link>

        <Link href="/kasa" className="group">
          <Card className="p-4 transition-all hover:border-line-strong hover:bg-raised/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Bugünkü Tahsilat</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-raised text-muted group-hover:text-ready">
                <Coins className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-ready">
                {formatTL(todayCollected)}
              </p>
              <Badge variant="outline" className="text-[11px]">
                Nakit / Kart
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted truncate">
              {unpaidTotal > 0 ? `${formatTL(unpaidTotal)} açık bakiye` : "Tüm işler tahsil edildi"}
            </p>
          </Card>
        </Link>

        <Link href="/randevular" className="group">
          <Card className="p-4 transition-all hover:border-accent/40 hover:bg-raised/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Bugünkü Randevu</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-raised text-muted group-hover:text-accent-strong">
                <CalendarDays className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-accent-strong">
                {appointments.length}
              </p>
              <Badge variant="primary" className="text-[11px]">
                Planlı
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted truncate">Kabul bekleyen randevular</p>
          </Card>
        </Link>
      </section>

      {/* Visual Charts & Analytics */}
      <section aria-label="Analitik Grafikler">
        <TodayAnalyticsCharts
          weeklyData={weeklyData}
          serviceDistribution={serviceDistribution}
          todayCollected={todayCollected}
          unpaidTotal={unpaidTotal}
        />
      </section>

      {/* Appointments & Bring-back Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Bugünkü Randevu Akışı</Eyebrow>
            <Link
              href="/randevular"
              className="inline-flex h-11 items-center text-xs font-semibold text-accent-strong hover:underline"
            >
              Takvimi Aç &rarr;
            </Link>
          </div>
          {appointments.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted border-dashed">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted/40" />
              Bugün için planlanmış randevu bulunmuyor.
            </Card>
          ) : (
            <ul className="space-y-2">
              {appointments.map((a, i) => (
                <li key={a.id}>
                  <Card
                    className={`flex items-center gap-3 p-3.5 transition-colors ${
                      i === nextIndex
                        ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                        : "hover:border-line-strong"
                    }`}
                  >
                    <span
                      className={`w-14 font-display text-lg font-bold tabular-nums ${
                        i === nextIndex ? "text-accent-strong" : "text-ink"
                      }`}
                    >
                      {time(a.startsAt)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        {a.pet && <PetTag pet={a.pet} size="xs" />}
                        <span className="truncate font-semibold text-sm">
                          {a.pet?.breed ?? ""}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {[a.title, a.station?.name].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {a.status === "ARRIVED" ? (
                      <Badge variant="success" size="sm">
                        Geldi
                      </Badge>
                    ) : i === nextIndex ? (
                      <Badge variant="primary" size="sm">
                        Sıradaki
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        Bekliyor
                      </Badge>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Bakım & Kontrol Hatırlatmaları</Eyebrow>
            <span className="text-xs text-muted">Zamanı gelen müşteriler</span>
          </div>
          {reminders.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted border-dashed">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted/40" />
              Bu hafta hatırlatılacak tıraş veya bakım hatırlatması yok.
            </Card>
          ) : (
            <ul className="space-y-2">
              {reminders.map((r) => (
                <li key={r.id}>
                  <Card className="space-y-3 p-3.5 hover:border-line-strong transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PetTag pet={r.pet} size="xs" />
                        <span className="truncate font-semibold text-sm">
                          {r.customer.name}
                        </span>
                      </div>
                      <Badge variant="warning" size="sm">
                        Zamanı Geldi
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">{r.title}</p>
                    <ReminderActions
                      id={r.id}
                      href={`https://wa.me/${whatsappNumber(
                        r.customer.phone
                      )}?text=${encodeURIComponent(
                        `Merhaba ${r.customer.name}, ${r.title.toLocaleLowerCase(
                          "tr-TR"
                        )} zamanı geldi. Size uygun bir gün için randevu ayarlayalım mı? - ${
                          user.business.name
                        }`
                      )}`}
                    />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
