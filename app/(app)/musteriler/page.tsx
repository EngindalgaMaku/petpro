import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight, PawPrint, Plus, Search, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { PetTag } from "@/components/pet-tag";
import { buttonStyles, Card, Input } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Müşteriler" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sayfa?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const currentPage = Math.max(1, Number(sp.sayfa || "1"));

  // Arama filtresi: hayvan adı, sahip adı veya telefon
  const or: Prisma.CustomerWhereInput[] = [];
  if (q) {
    or.push({ name: { contains: q } });
    or.push({ pets: { some: { name: { contains: q } } } });
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ phone: { contains: digits.length >= 10 ? normalizePhone(digits) : digits } });
  }

  const whereCondition = {
    businessId: user.businessId,
    ...(or.length && { OR: or }),
  };

  const [totalCustomers, totalPets, matchingCount, customers] = await Promise.all([
    prisma.customer.count({ where: { businessId: user.businessId } }),
    prisma.pet.count({ where: { businessId: user.businessId } }),
    prisma.customer.count({ where: whereCondition }),
    prisma.customer.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        pets: { select: { name: true, breed: true, size: true } },
        workOrders: {
          where: { stage: { not: "CANCELLED" } },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true, totalAmount: true, payments: { select: { amount: true } } },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));

  // Borçlu müşteri sayısı
  const debtCount = customers.filter((c) =>
    c.workOrders.some((o) => Number(o.totalAmount) > o.payments.reduce((p, x) => p + Number(x.amount), 0))
  ).length;

  const pageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("sayfa", String(p));
    const qs = params.toString();
    return `/musteriler${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 md:px-8">
      {/* Üst Başlık ve Hızlı Eylem */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Müşteriler ve Hayvanlar</h1>
          <p className="mt-1 text-sm text-muted">Kayıtlı müşteriler, bakım geçmişi ve açık bakiyeler</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kabul" className={buttonStyles({ size: "md", className: "gap-2" })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Yeni Kabul
          </Link>
        </div>
      </header>

      {/* KPI / Özet Kartları */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-accent-strong">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-ink">{totalCustomers}</p>
            <p className="text-xs text-muted">Toplam Müşteri</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised border border-line text-accent-strong">
            <PawPrint className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-ink">{totalPets}</p>
            <p className="text-xs text-muted">Kayıtlı Hayvan</p>
          </div>
        </Card>

        <Card className="col-span-2 sm:col-span-1 flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/10 border border-danger/20 text-danger">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-danger">{debtCount}</p>
            <p className="text-xs text-muted">Açık Bakiyeli Müşteri</p>
          </div>
        </Card>
      </div>

      {/* Arama Alanı */}
      <form role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Hayvan adı, müşteri adı veya telefon ara..."
          aria-label="Müşteri ara"
          className="h-12 pl-12 text-base md:text-lg rounded-xl bg-surface border-line"
          autoComplete="off"
        />
      </form>

      {/* Müşteri Listesi (Masaüstünde Çok Sütunlu Grid) */}
      {customers.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted">
          {q ? `“${q}” ile eşleşen müşteri bulunamadı.` : "Henüz müşteri yok. İlk kabulde müşteri kaydı otomatik açılır."}
        </Card>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {customers.map((c) => {
            const debt = c.workOrders.reduce(
              (s, o) => s + Math.max(0, Number(o.totalAmount) - o.payments.reduce((p, x) => p + Number(x.amount), 0)),
              0
            );
            const last = c.workOrders[0]?.createdAt;

            return (
              <li key={c.id}>
                <Link
                  href={`/musteriler/${c.id}`}
                  className="flex flex-col justify-between h-full rounded-2xl border border-line bg-surface p-4 transition-all hover:border-line-strong hover:bg-raised/40 hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* İsim & Telefon & Ok İkonu */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink text-base truncate">{c.name}</p>
                        <p className="text-xs text-muted mt-0.5">{formatPhone(c.phone)}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                    </div>

                    {/* Hayvanlar */}
                    {c.pets.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {c.pets.map((v) => (
                          <div key={v.name} className="flex items-center gap-1.5 bg-raised/70 rounded-lg p-1 pr-2 border border-line">
                            <PetTag pet={v} size="xs" />
                            {v.breed && (
                              <span className="text-[11px] text-muted truncate max-w-[120px]">
                                {v.breed}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alt Bilgi: Ziyaret Sayısı ve Borç */}
                  <div className="flex items-center justify-between border-t border-line/60 pt-3 mt-4 text-xs text-muted">
                    <span>
                      {c.workOrders.length} ziyaret
                      {last && (
                        <span className="hidden sm:inline">
                          {" "}· {last.toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" })}
                        </span>
                      )}
                    </span>
                    {debt > 0 ? (
                      <span className="font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-md">
                        {formatTL(debt)} borç
                      </span>
                    ) : (
                      <span className="text-[11px] text-ready">Borç yok</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sayfalama Kontrolleri */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line/60 pt-5 text-sm">
          <p className="text-xs text-muted">
            Toplam <strong className="text-ink">{matchingCount}</strong> müşteriden{" "}
            <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong> -{" "}
            <strong>{Math.min(currentPage * PAGE_SIZE, matchingCount)}</strong> arası gösteriliyor
          </p>

          <nav aria-label="Sayfalama" className="flex items-center gap-1.5">
            {currentPage > 1 ? (
              <Link
                href={pageUrl(currentPage - 1)}
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
                      href={pageUrl(p as number)}
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
                href={pageUrl(currentPage + 1)}
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
