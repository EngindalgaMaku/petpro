import { SIZES } from "@/lib/stages";
import { notFound } from "next/navigation";
import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { requireUser } from "@/lib/session";
import { PrintWorkOrderView, type PrintWorkOrderData } from "./print-view";

export const metadata = { title: "Yazdırılabilir İş Emri" };
export const dynamic = "force-dynamic";

export default async function PrintWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const order = await prisma.workOrder.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      business: true,
      pet: true,
      customer: true,
      station: { select: { name: true } },
      groomer: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
      inspection: {
        include: {
          marks: { orderBy: { number: "asc" } },
        },
      },
    },
  });

  if (!order) notFound();

  const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(order.totalAmount);
  const remaining = Math.max(0, totalAmount - paid);

  // Generate QR code for tracking URL
  const trackUrl = `${await appUrl()}/t/${order.trackingToken}`;
  const qrDataUrl = await generateQrDataUrl(trackUrl, 160);

  const printData: PrintWorkOrderData = {
    order: {
      id: order.id,
      number: order.number,
      trackingToken: order.trackingToken,
      createdAt: order.createdAt.toISOString(),
      promisedAt: order.promisedAt?.toISOString() ?? null,
      weightKg: order.weightKg === null ? null : Number(order.weightKg),
      notes: order.notes,
      totalAmount,
      paid,
      remaining,
      groomerName: order.groomer?.name ?? null,
      stationName: order.station?.name ?? null,
    },
    pet: {
      name: order.pet.name,
      breed: order.pet.breed,
      birthYear: order.pet.birthYear,
      color: order.pet.color,
      size: SIZES[order.pet.size].label,
      temperament: { CALM: "Sakin", NERVOUS: "Ürkek", BITES: "Isırabilir" }[order.pet.temperament],
      allergies: order.pet.allergies,
    },
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
    },
    business: {
      name: order.business.name,
      phone: order.business.phone,
      address: order.business.address,
      city: order.business.city,
      taxNumber: order.business.taxNumber,
    },
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      packageName: i.packageName,
      detail: detailSummary(i.kind, i.details as ItemDetails | null) || null,
      price: Number(i.totalPrice),
    })),
    marks: (order.inspection?.marks ?? []).map((m) => ({
      id: m.id,
      number: m.number,
      part: m.part,
      kind: m.kind,
      note: m.note,
    })),
    qrDataUrl,
    trackUrl,
  };

  return <PrintWorkOrderView data={printData} />;
}
