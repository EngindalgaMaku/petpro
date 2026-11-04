import { notFound } from "next/navigation";
import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { requireUser } from "@/lib/session";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { SIZES } from "@/lib/stages";
import { WorkOrderView } from "./work-order-view";

export const metadata = { title: "İş emri" };
export const dynamic = "force-dynamic";

/** Anything but a bath needs the grooming stage */
const BATH_ONLY_KINDS = ["BATH", "PARASITE"];

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [order, groomers, stations] = await Promise.all([
    prisma.workOrder.findFirst({
      where: { id, businessId: user.businessId },
      include: {
        pet: true,
        customer: { select: { name: true, phone: true } },
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } },
        events: { orderBy: { createdAt: "desc" } },
        inspection: { select: { customerApprovedAt: true, _count: { select: { marks: true } } } },
        _count: { select: { photos: true } },
      },
    }),
    prisma.user.findMany({ where: { businessId: user.businessId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.station.findMany({ where: { businessId: user.businessId, isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!order) notFound();

  const names = new Map(groomers.map((t) => [t.id, t.name]));
  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
  const qrDataUrl = await generateQrDataUrl(`${await appUrl()}/t/${order.trackingToken}`, 160);

  return (
    <WorkOrderView
      businessName={user.business.name}
      qrDataUrl={qrDataUrl}
      groomers={groomers}
      stations={stations}
      order={{
        id: order.id,
        number: order.number,
        trackingToken: order.trackingToken,
        stage: order.stage,
        petName: order.pet.name,
        breed: [order.pet.breed, SIZES[order.pet.size].label, order.pet.color].filter(Boolean).join(" · "),
        alerts: [
          order.pet.temperament === "BITES" && "Isırabilir",
          order.pet.temperament === "NERVOUS" && "Ürkek",
          order.pet.allergies && `Alerji: ${order.pet.allergies}`,
          order.pet.vaccineDue && order.pet.vaccineDue < new Date() && "Aşı tarihi geçmiş",
        ].filter(Boolean) as string[],
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        groomerId: order.groomerId ?? "",
        stationId: order.stationId ?? "",
        weightKg: order.weightKg === null ? null : Number(order.weightKg),
        promisedAt: order.promisedAt?.toISOString() ?? null,
        notes: order.notes,
        total: Number(order.totalAmount),
        paid,
        needsGrooming: order.items.some((i) => !BATH_ONLY_KINDS.includes(i.kind)),
        record: {
          marks: order.inspection?._count.marks ?? 0,
          photos: order._count.photos,
          approved: !!order.inspection?.customerApprovedAt,
        },
        items: order.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.totalPrice),
          detail: [i.packageName && `Paket: ${i.packageName}`, detailSummary(i.kind, i.details as ItemDetails | null)].filter(Boolean).join(" · "),
        })),
        payments: order.payments.map((p) => ({ id: p.id, amount: Number(p.amount), method: p.method, note: p.note, paidAt: p.paidAt.toISOString() })),
        events: order.events.map((e) => ({
          id: e.id,
          stage: e.stage,
          note: e.note,
          at: e.createdAt.toISOString(),
          by: e.userId ? names.get(e.userId) ?? null : null,
        })),
      }}
    />
  );
}
