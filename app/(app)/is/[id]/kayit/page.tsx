import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { InspectionEditor } from "./inspection-editor";

export const metadata = { title: "Kabul muayenesi" };
export const dynamic = "force-dynamic";

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await prisma.workOrder.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      pet: { select: { name: true, breed: true, size: true } },
      inspection: {
        include: {
          marks: { orderBy: { number: "asc" }, include: { photos: { select: { id: true } } } },
        },
      },
      photos: { where: { kind: { in: ["BEFORE", "AFTER"] } }, orderBy: { createdAt: "asc" }, select: { id: true, kind: true } },
    },
  });
  if (!order) notFound();
  const ins = order.inspection;

  return (
    <InspectionEditor
      orderId={order.id}
      pet={{ name: order.pet.name, size: order.pet.size }}
      breed={order.pet.breed ?? ""}
      approvedAt={ins?.customerApprovedAt?.toISOString() ?? null}
      marks={(ins?.marks ?? []).map((m) => ({ id: m.id, number: m.number, part: m.part, kind: m.kind, note: m.note, photoIds: m.photos.map((p) => p.id) }))}
      photos={order.photos}
    />
  );
}
