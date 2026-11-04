import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PetSize } from "@prisma/client";
import { PetFaces } from "@/components/pet-art";
import { Card } from "@/components/ui";
import { bookableDays } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { planOf } from "@/lib/plan";
import { SIZES } from "@/lib/stages";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

const load = (slug: string) =>
  prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      city: true,
      district: true,
      phone: true,
      isDemo: true,
      createdAt: true,
      entryEndsAt: true,
      paidUntil: true,
      bookingEnabled: true,
      closedDays: true,
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, description: true, basePrice: true, durationMinutes: true },
      },
      sizes: { select: { size: true, multiplier: true } },
    },
  });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const business = await load((await params).slug);
  if (!business) return { title: "Bulunamadı" };
  return {
    title: `${business.name} online randevu`,
    description: `${business.name} için boş saatleri görün, online randevu talebi bırakın.`,
    robots: business.isDemo ? { index: false, follow: false } : undefined,
  };
}

/** The salon's public page: the link it puts on Instagram. No sign-in */
export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await load(slug);
  if (!business) notFound();

  const open = business.bookingEnabled && planOf(business).level !== "RESTRICTED" && business.services.length > 0;
  const where = [business.district, business.city].filter(Boolean).join(", ");
  const factors = Object.fromEntries(
    (Object.keys(SIZES) as PetSize[]).map((s) => [s, Number(business.sizes.find((m) => m.size === s)?.multiplier ?? SIZES[s].defaultMultiplier)])
  ) as Record<PetSize, number>;

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-10 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <header className="paw-bg flex items-center justify-between gap-3 overflow-hidden rounded-card border border-line bg-surface p-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">Online randevu</p>
          <h1 className="font-display text-[28px] font-bold leading-tight">{business.name}</h1>
          {where && <p className="text-sm text-muted">{where}</p>}
        </div>
        <PetFaces className="h-16 shrink-0" />
      </header>
      {business.isDemo && (
        <p role="note" className="rounded-xl bg-accent/10 px-3 py-2 text-sm">
          Bu bir demo salon. Gerçek bilgi girmeyin, talepler her gece silinir.
        </p>
      )}
      {open ? (
        <BookingForm
          slug={slug}
          businessName={business.name}
          businessPhone={business.phone}
          days={bookableDays(business.closedDays)}
          factors={factors}
          services={business.services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description ?? "",
            basePrice: Number(s.basePrice),
            durationMinutes: s.durationMinutes,
          }))}
        />
      ) : (
        <Card className="space-y-2 p-5" data-testid="booking-closed">
          <p className="font-semibold">Bu salon şu an online randevu almıyor.</p>
          {business.phone && (
            <a href={`tel:${business.phone}`} className="inline-flex min-h-11 items-center font-semibold text-accent-strong">
              {formatPhone(business.phone)}
            </a>
          )}
        </Card>
      )}
    </main>
  );
}
