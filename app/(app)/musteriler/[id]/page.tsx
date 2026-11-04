import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, MessageCircle, Phone, Plus } from "lucide-react";
import { PetTag } from "@/components/pet-tag";
import { buttonStyles, Card, Eyebrow } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { formatPhone, whatsappNumber } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { CustomerEdit } from "./customer-edit";

export const metadata = { title: "Müşteri" };
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await prisma.customer.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      pets: {
        orderBy: { createdAt: "asc" },
        include: {
          workOrders: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              number: true,
              stage: true,
              createdAt: true,
              totalAmount: true,
              items: { select: { name: true } },
              payments: { select: { amount: true } },
            },
          },
        },
      },
      reminders: { where: { status: "PENDING" }, orderBy: { dueAt: "asc" }, include: { pet: { select: { name: true } } } },
    },
  });
  if (!c) notFound();

  const orders = c.pets.flatMap((v) => v.workOrders.filter((o) => o.stage !== "CANCELLED"));
  const spent = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const debt = orders.reduce((s, o) => s + Math.max(0, Number(o.totalAmount) - o.payments.reduce((p, x) => p + Number(x.amount), 0)), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-6 md:px-8">
      <Link href="/musteriler" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Müşteriler
      </Link>

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-[28px] font-bold">{c.name}</h1>
          <p className="text-muted">{formatPhone(c.phone)}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a href={`tel:${c.phone}`} aria-label="Ara" className={buttonStyles({ variant: "secondary", size: "icon" })}>
            <Phone className="h-5 w-5" aria-hidden="true" />
          </a>
          <a href={`https://wa.me/${whatsappNumber(c.phone)}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={buttonStyles({ variant: "secondary", size: "icon" })}>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </header>

      <section aria-label="Özet" className="grid grid-cols-3 gap-2">
        {[
          { label: "Ziyaret", value: String(orders.length), cls: "" },
          { label: "Toplam iş", value: formatTL(spent), cls: "" },
          { label: "Borç", value: formatTL(debt), cls: debt > 0 ? "text-danger" : "text-muted" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <p className={cn("truncate font-display text-xl font-bold tabular-nums", s.cls)}>{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </section>

      {c.reminders.length > 0 && (
        <Card className="space-y-2 border-accent/60 p-4">
          <Eyebrow>Bekleyen hatırlatmalar</Eyebrow>
          <ul className="space-y-1 text-sm">
            {c.reminders.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>
                  {r.title} · {r.pet.name}
                </span>
                <span className="shrink-0 text-muted">{day(r.dueAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {c.pets.map((v) => (
        <Card key={v.id} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line p-4">
            <div className="flex min-w-0 items-center gap-3">
              <PetTag pet={v} size="sm" />
              <span className="truncate text-sm text-muted">{[v.breed, v.color, v.birthYear && `${v.birthYear} doğumlu`].filter(Boolean).join(" · ")}</span>
            </div>
            <Link href={`/kabul?telefon=${c.phone}`} className={buttonStyles({ size: "sm", className: "shrink-0" })}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Kabul
            </Link>
          </div>
          {v.workOrders.length === 0 ? (
            <p className="p-4 text-sm text-muted">Henüz bakım yok.</p>
          ) : (
            <ul className="divide-y divide-line">
              {v.workOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/is/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-raised">
                    <span className="w-24 shrink-0 text-sm tabular-nums text-muted">{day(o.createdAt)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{o.items.map((i) => i.name).join(", ")}</span>
                      <span className={cn("block text-xs", o.stage === "CANCELLED" ? "text-danger" : o.stage === "DELIVERED" ? "text-muted" : "text-accent-strong")}>
                        {STAGES[o.stage].label}
                      </span>
                    </span>
                    <span className="shrink-0 font-display font-semibold tabular-nums">{formatTL(o.totalAmount)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <CustomerEdit id={c.id} name={c.name} phone={formatPhone(c.phone)} notes={c.notes ?? ""} marketingConsent={c.marketingConsent} />
    </div>
  );
}
