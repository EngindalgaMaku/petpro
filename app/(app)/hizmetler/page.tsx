import type { PetSize } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/session";
import { SIZES } from "@/lib/stages";
import { ServicesEditor } from "./services-editor";

export const metadata = { title: "Hizmetler ve Fiyatlar" };

export default async function ServicesPage() {
  const user = await requireUser();
  const [services, multipliers, packages] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: user.businessId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.sizeMultiplier.findMany({ where: { businessId: user.businessId } }),
    prisma.servicePackage.findMany({
      where: { businessId: user.businessId },
      orderBy: { sortOrder: "asc" },
      include: { items: { select: { serviceId: true } } },
    }),
  ]);

  const factor = Object.fromEntries(
    (Object.keys(SIZES) as PetSize[]).map((s) => [
      s,
      Number(multipliers.find((m) => m.size === s)?.multiplier ?? SIZES[s].defaultMultiplier),
    ])
  ) as Record<PetSize, number>;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8">
      <ServicesEditor
        canEdit={canManage(user.role)}
        multipliers={factor}
        packages={packages.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          serviceIds: p.items.map((i) => i.serviceId),
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
          defaultProduct: s.defaultProduct ?? "",
          description: s.description ?? "",
          basePrice: Number(s.basePrice),
          durationMinutes: s.durationMinutes,
          stationType: s.stationType ?? "",
          reminderWeeks: s.reminderWeeks,
          isActive: s.isActive,
        }))}
      />
    </div>
  );
}
