import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { adminKeyMatches } from "@/lib/admin-key";
import { prisma } from "@/lib/db";
import { formatPhone, whatsappNumber } from "@/lib/phone";
import { entryEnd, planLabel, planOf, type PlanLevel } from "@/lib/plan";
import { changePlan } from "./actions";

export const metadata = { title: "Yönetim", robots: { index: false, follow: false }, referrer: "same-origin" as const };
export const dynamic = "force-dynamic";

const day = (d: Date | null) => (d ? d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" }) : "—");

const TONE: Record<PlanLevel, string> = {
  DEMO: "bg-raised text-muted",
  ENTRY: "bg-accent/15 text-accent-strong",
  PAID: "bg-ready/15 text-ready",
  RESTRICTED: "bg-danger/10 text-danger",
};

const ACTIONS = [
  { action: "entry30", label: "Giriş seviyesi +30 gün" },
  { action: "paid30", label: "Ücretli +30 gün" },
  { action: "paid365", label: "Ücretli +1 yıl" },
  { action: "restrict", label: "Kısıtlı moda al" },
];

/** Private page: /yonetim?key=<ADMIN_KEY>. Who signed up, how they use it, what level they are on */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!adminKeyMatches(key)) notFound();

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const businesses = await prisma.business.findMany({
    where: { isDemo: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      isDemo: true,
      createdAt: true,
      entryEndsAt: true,
      paidUntil: true,
      users: { orderBy: { createdAt: "asc" }, select: { name: true, email: true, lastLoginAt: true } },
      _count: { select: { workOrders: { where: { createdAt: { gte: since } } }, customers: true } },
    },
  });
  const rows = businesses.map((b) => ({ ...b, plan: planOf(b) }));
  const count = (level: PlanLevel) => rows.filter((r) => r.plan.level === level).length;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-[calc(2rem+env(safe-area-inset-top))]">
      <header>
        <h1 className="font-display text-[28px] font-bold">Kaydolan işletmeler</h1>
        <p className="text-sm text-muted">
          {rows.length} işletme · {count("ENTRY")} giriş seviyesi · {count("RESTRICTED")} kısıtlı · {count("PAID")} ücretli
        </p>
      </header>
      {rows.length === 0 && <p className="text-muted">Henüz kaydolan işletme yok.</p>}
      {rows.map((b) => {
        const lastLogin = b.users.map((u) => u.lastLoginAt).filter(Boolean).sort((x, y) => y!.getTime() - x!.getTime())[0] ?? null;
        const phone = b.phone ?? "";
        return (
          <Card key={b.id} className="space-y-3 p-4" data-testid="admin-business">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-xl font-bold">{b.name}</p>
                <p className="text-sm text-muted">
                  {b.users[0]?.name} · {b.users[0]?.email}
                  {phone && (
                    <>
                      {" · "}
                      <a href={`https://wa.me/${whatsappNumber(phone)}`} target="_blank" rel="noreferrer" className="font-medium text-accent-strong">
                        {formatPhone(phone)}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${TONE[b.plan.level]}`}>
                {planLabel[b.plan.level]}
                {b.plan.daysLeft > 0 && ` · ${b.plan.daysLeft} gün`}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-5">
              <div><dt className="text-muted">Kayıt</dt><dd>{day(b.createdAt)}</dd></div>
              <div><dt className="text-muted">Giriş seviyesi sonu</dt><dd>{day(entryEnd(b))}</dd></div>
              <div><dt className="text-muted">Ücretli sonu</dt><dd>{day(b.paidUntil)}</dd></div>
              <div><dt className="text-muted">Son giriş</dt><dd>{day(lastLogin)}</dd></div>
              <div><dt className="text-muted">Kullanım</dt><dd>{b._count.workOrders} iş (30 gün) · {b._count.customers} müşteri</dd></div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <form key={a.action} action={changePlan}>
                  <input type="hidden" name="adminKey" value={key} />
                  <input type="hidden" name="businessId" value={b.id} />
                  <input type="hidden" name="change" value={a.action} />
                  <button type="submit" className="min-h-11 rounded-xl border border-line bg-raised px-3 text-sm font-medium hover:border-line-strong">
                    {a.label}
                  </button>
                </form>
              ))}
            </div>
          </Card>
        );
      })}
    </main>
  );
}
