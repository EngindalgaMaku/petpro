import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PetTag } from "@/components/pet-tag";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { SIZES } from "@/lib/stages";
import { PrintButton } from "./print-button";

export const metadata = { title: "Bakım karnesi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

// The pet's visits, for the owner who holds a tracking link. Like that page it shows the pet and
// the work only, never the owner's phone or address, and no prices
export default async function CareCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(token)) notFound();
  const order = await prisma.workOrder.findUnique({
    where: { trackingToken: token },
    select: {
      business: { select: { name: true } },
      pet: {
        select: {
          id: true,
          name: true,
          breed: true,
          size: true,
          color: true,
          birthYear: true,
          allergies: true,
          vaccineDue: true,
          reminders: { where: { status: "PENDING" }, orderBy: { dueAt: "asc" }, take: 1, select: { title: true, dueAt: true } },
          workOrders: {
            where: { stage: "DELIVERED" },
            orderBy: { deliveredAt: "desc" },
            take: 24,
            select: {
              id: true,
              deliveredAt: true,
              weightKg: true,
              groomer: { select: { name: true } },
              items: { select: { id: true, name: true, kind: true, details: true } },
            },
          },
        },
      },
    },
  });
  if (!order) notFound();
  const { pet, business } = order;
  const next = pet.reminders[0];

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))] print:max-w-none print:p-0">
      <div className="no-print flex items-center justify-between gap-3">
        <Link href={`/t/${token}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Takip sayfası
        </Link>
        <PrintButton title={`${pet.name} bakım karnesi`} />
      </div>

      <header>
        <p className="font-display text-lg font-bold">{business.name}</p>
        <h1 className="mt-1 font-display text-[28px] font-bold">Bakım karnesi</h1>
      </header>

      <Card className="space-y-3 p-4">
        <PetTag pet={pet} size="md" />
        <p className="text-sm text-muted">
          {[pet.breed, SIZES[pet.size].label, pet.color, pet.birthYear && `${pet.birthYear} doğumlu`].filter(Boolean).join(" · ")}
        </p>
        {pet.allergies && (
          <p className="text-sm">
            <span className="font-semibold">Alerji, hassasiyet:</span> {pet.allergies}
          </p>
        )}
        {pet.vaccineDue && (
          <p className="text-sm">
            <span className="font-semibold">Aşı bitiş tarihi:</span> {fmt(pet.vaccineDue)}
          </p>
        )}
        {next && (
          <p className="rounded-xl bg-raised p-3 text-sm">
            <span className="font-semibold">Sıradaki bakım:</span> {fmt(next.dueAt)} civarı
          </p>
        )}
      </Card>

      <section aria-label="Ziyaretler" className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Ziyaretler · {pet.workOrders.length}</h2>
        {pet.workOrders.length === 0 && <p className="text-sm text-muted">Henüz teslim edilmiş bakım yok.</p>}
        {pet.workOrders.map((o) => (
          <Card key={o.id} className="p-4">
            <p className="font-semibold">{o.deliveredAt ? fmt(o.deliveredAt) : ""}</p>
            <p className="text-xs text-muted">
              {[o.groomer?.name, o.weightKg && `${Number(o.weightKg).toLocaleString("tr-TR")} kg`].filter(Boolean).join(" · ")}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {o.items.map((i) => {
                const detail = detailSummary(i.kind, i.details as ItemDetails | null);
                return (
                  <li key={i.id}>
                    {i.name}
                    {detail && <span className="text-muted"> · {detail}</span>}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </section>
    </main>
  );
}
