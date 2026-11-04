import Link from "next/link";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
} from "lucide-react";
import type { WorkStage } from "@prisma/client";
import { PetTag } from "@/components/pet-tag";
import { buttonStyles, Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { elapsed, whenLabel } from "@/lib/elapsed";
import { formatTL } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { BOARD_STAGES, STAGES } from "@/lib/stages";
import { Board, type BoardCard } from "./board";

export const metadata = { title: "Salon" };
export const dynamic = "force-dynamic";

const ARCHIVE_PAGE_SIZE = 15;

export default async function SalonPage({
  searchParams,
}: {
  searchParams: Promise<{ gorunum?: string; sayfa?: string }>;
}) {
  const user = await requireUser();
  const businessId = user.businessId;
  const sp = await searchParams;
  const isArchive = sp.gorunum === "arsiv";
  const currentPage = Math.max(1, Number(sp.sayfa || "1"));

  const liveStages: WorkStage[] = [...BOARD_STAGES, "TAXI_DELIVERY"];

  const [liveOrdersCount, archiveOrdersCount] = await Promise.all([
    prisma.workOrder.count({ where: { businessId, stage: { in: liveStages } } }),
    prisma.workOrder.count({ where: { businessId, stage: { in: ["DELIVERED", "CANCELLED"] } } }),
  ]);

  if (isArchive) {
    const archivedOrders = await prisma.workOrder.findMany({
      where: { businessId, stage: { in: ["DELIVERED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * ARCHIVE_PAGE_SIZE,
      take: ARCHIVE_PAGE_SIZE,
      include: {
        pet: { select: { name: true, breed: true, size: true } },
        customer: { select: { name: true, phone: true } },
        items: { select: { name: true } },
        payments: { select: { amount: true } },
      },
    });

    const totalPages = Math.max(1, Math.ceil(archiveOrdersCount / ARCHIVE_PAGE_SIZE));

    return (
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 space-y-6">
        {/* Header & Tabs */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold">Salon İş Takibi</h1>
            <p className="text-sm text-muted">Geçmişte teslim edilen ve arşivlenen iş emirleri</p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/kabul" className={buttonStyles({ size: "md", className: "gap-2" })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Yeni Kabul
            </Link>
          </div>
        </header>

        {/* Görünüm Sekmeleri */}
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Link
            href="/salon"
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-raised hover:text-ink"
          >
            Salon Panosu ({liveOrdersCount})
          </Link>
          <Link
            href="/salon?gorunum=arsiv"
            className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-ink shadow-sm"
          >
            Tamamlanan & Arşiv ({archiveOrdersCount})
          </Link>
        </div>

        {/* Arşiv Listesi */}
        {archivedOrders.length === 0 ? (
          <Card className="p-12 text-center text-sm text-muted">
            Henüz tamamlanmış veya teslim edilmiş iş emri bulunmuyor.
          </Card>
        ) : (
          <div className="space-y-3">
            {archivedOrders.map((o) => {
              const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
              const total = Number(o.totalAmount);
              const remaining = Math.max(0, total - paid);
              const isDelivered = o.stage === "DELIVERED";

              return (
                <Card
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:border-line-strong hover:bg-raised/40"
                >
                  {/* Hayvan ve Müşteri */}
                  <div className="flex items-center gap-3 min-w-[260px]">
                    <PetTag pet={o.pet} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/is/${o.id}`} className="font-bold text-ink hover:underline">
                          {(o.pet.breed ?? "") || "Hayvan"}
                        </Link>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isDelivered ? "bg-ready/15 text-ready" : "bg-danger/15 text-danger"
                          }`}
                        >
                          {STAGES[o.stage]?.label ?? o.stage}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {o.customer.name} · {formatPhone(o.customer.phone)}
                      </p>
                      <p className="font-mono text-[11px] text-muted">{o.number}</p>
                    </div>
                  </div>

                  {/* Uygulanan Hizmetler */}
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[11px] text-muted">Uygulanan Hizmetler</p>
                    <p className="text-xs font-medium text-ink line-clamp-1">
                      {o.items.map((i) => i.name).join(", ") || "Hizmet belirtilmedi"}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      Kayıt: {new Date(o.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>

                  {/* Tutar & Tahsilat */}
                  <div className="text-right min-w-[120px]">
                    <p className="text-[11px] text-muted">Toplam Tutar</p>
                    <p className="font-display text-base font-bold text-ink">{formatTL(total)}</p>
                    {remaining > 0 ? (
                      <span className="text-[11px] font-semibold text-danger">{formatTL(remaining)} bakiye</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-ready">Tahsil Edildi</span>
                    )}
                  </div>

                  {/* Hızlı Aksiyonlar */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/is/${o.id}/yazdir`}
                      target="_blank"
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-raised px-2.5 text-xs font-semibold text-ink transition hover:bg-surface"
                      title="Kabul fişini yazdır"
                    >
                      <Printer className="h-3.5 w-3.5 text-accent-strong" />
                      <span className="hidden sm:inline">Fiş</span>
                    </Link>
                    <Link
                      href={`/t/${o.trackingToken}/karne`}
                      target="_blank"
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-raised px-2.5 text-xs font-semibold text-ink transition hover:bg-surface"
                      title="Bakım karnesini aç"
                    >
                      <Award className="h-3.5 w-3.5 text-accent-strong" />
                      <span className="hidden sm:inline">Karne</span>
                    </Link>
                    <Link
                      href={`/is/${o.id}`}
                      className="flex h-9 items-center gap-1 rounded-xl bg-surface border border-line px-3 text-xs font-semibold text-ink hover:bg-raised"
                    >
                      Detay
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Sayfalama Kontrolleri */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line/60 pt-5 text-sm">
            <p className="text-xs text-muted">
              Toplam <strong className="text-ink">{archiveOrdersCount}</strong> iş emrinden{" "}
              <strong>{(currentPage - 1) * ARCHIVE_PAGE_SIZE + 1}</strong> -{" "}
              <strong>{Math.min(currentPage * ARCHIVE_PAGE_SIZE, archiveOrdersCount)}</strong> arası gösteriliyor
            </p>

            <nav aria-label="Sayfalama" className="flex items-center gap-1.5">
              {currentPage > 1 ? (
                <Link
                  href={`/salon?gorunum=arsiv&sayfa=${currentPage - 1}`}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:bg-raised"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-line/40 bg-surface/40 px-3 text-xs font-semibold text-muted/50 cursor-not-allowed">
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </span>
              )}

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push("...");
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-2 text-xs text-muted">
                        ...
                      </span>
                    ) : (
                      <Link
                        key={`page-${p}`}
                        href={`/salon?gorunum=arsiv&sayfa=${p}`}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition ${
                          currentPage === p
                            ? "bg-accent text-accent-ink shadow-sm"
                            : "border border-line bg-surface text-muted hover:border-line-strong hover:text-ink hover:bg-raised"
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}
              </div>

              {currentPage < totalPages ? (
                <Link
                  href={`/salon?gorunum=arsiv&sayfa=${currentPage + 1}`}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:bg-raised"
                >
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center gap-1 rounded-xl border border-line/40 bg-surface/40 px-3 text-xs font-semibold text-muted/50 cursor-not-allowed">
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </nav>
          </div>
        )}
      </div>
    );
  }

  // Salon Panosu (Live Board)
  const [orders, stations] = await Promise.all([
    prisma.workOrder.findMany({
      where: { businessId, stage: { in: liveStages } },
      orderBy: [{ promisedAt: "asc" }, { createdAt: "asc" }],
      include: {
        pet: { select: { name: true, breed: true, size: true } },
        items: { select: { name: true } },
        groomer: { select: { name: true } },
        station: { select: { name: true } },
        payments: { select: { amount: true } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.station.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const now = new Date();
  const cards: BoardCard[] = orders.map((o) => {
    const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
    const late = !!o.promisedAt && o.promisedAt < now && o.stage !== "READY" && o.stage !== "TAXI_DELIVERY";
    return {
      id: o.id,
      stage: o.stage === "TAXI_DELIVERY" ? "READY" : o.stage,
      taxi: o.stage === "TAXI_DELIVERY",
      petName: o.pet.name,
      breed: o.pet.breed ?? "",
      work: o.items.map((i) => i.name).join(", "),
      who: o.groomer?.name ?? null,
      station: o.station?.name ?? null,
      inStage: elapsed(o.events[0]?.createdAt ?? o.createdAt, now),
      promised: o.promisedAt ? whenLabel(o.promisedAt, now) : null,
      late,
      remaining: Math.max(0, Number(o.totalAmount) - paid),
    };
  });

  const busy = new Map<string, number>();
  for (const o of orders) {
    if (o.stationId && o.stage !== "READY" && o.stage !== "TAXI_DELIVERY") {
      busy.set(o.stationId, (busy.get(o.stationId) ?? 0) + 1);
    }
  }

  return (
    <div className="px-4 pt-6 md:px-8 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold">Salon</h1>
          <p className="text-sm text-muted">{orders.length} hayvan içeride</p>
        </div>

        <Link href="/kabul" className={buttonStyles({ className: "hidden md:inline-flex" })}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Yeni Kabul
        </Link>
      </header>

      {/* Görünüm Sekmeleri */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <Link
          href="/salon"
          className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-ink shadow-sm"
        >
          Salon Panosu ({orders.length})
        </Link>
        <Link
          href="/salon?gorunum=arsiv"
          className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-raised hover:text-ink"
        >
          Tamamlanan & Arşiv ({archiveOrdersCount})
        </Link>
      </div>

      {stations.length > 0 && (
        <section aria-label="İstasyonlar" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stations.map((s) => {
            const n = busy.get(s.id) ?? 0;
            return (
              <div key={s.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${n ? "bg-danger" : "bg-ready"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{s.name}</span>
                  <span className="block text-xs text-muted">{n ? `Dolu · ${n} hayvan` : "Boş"}</span>
                </span>
              </div>
            );
          })}
        </section>
      )}

      <Board cards={cards} columns={BOARD_STAGES.map((s) => ({ stage: s, title: STAGES[s].label }))} />
    </div>
  );
}
