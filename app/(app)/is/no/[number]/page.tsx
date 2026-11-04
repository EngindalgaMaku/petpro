import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// A work order number from a receipt or a key tag (PP-261104-NRHJ) opens that work order
export default async function WorkOrderByNumber({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser();
  const order = await prisma.workOrder.findFirst({
    where: { businessId: user.businessId, number: decodeURIComponent(number).toUpperCase() },
    select: { id: true },
  });
  if (!order) notFound();
  redirect(`/is/${order.id}`);
}
