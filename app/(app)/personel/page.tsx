import { periodRange } from "@/lib/cash-report";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parseDayTR } from "@/lib/turkey-time";
import { PersonelClient, type StaffItem } from "./personel-client";

export const metadata = { title: "Personel & Prim Yönetimi" };
export const dynamic = "force-dynamic";

const tz = { timeZone: "Europe/Istanbul" } as const;
const round = (n: number) => Math.round(n * 100) / 100;

function shiftMonth(key: string, by: number) {
  const [y, m] = key.split("-").map(Number);
  const i = y * 12 + (m - 1) + by;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

export default async function PersonelPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requireUser();
  const { key: month, start, end } = periodRange("ay", (await searchParams).ay);

  // A commission is earned on handover, so a month is the pets delivered in that month
  const [users, delivered] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workOrder.findMany({
      where: {
        businessId: user.businessId,
        stage: "DELIVERED",
        deliveredAt: { gte: start, lt: end },
      },
      include: {
        pet: { select: { name: true, breed: true, size: true } },
        items: true,
      },
      orderBy: { deliveredAt: "desc" },
    }),
  ]);

  const staffList: StaffItem[] = users.map((u) => {
    const rate = Number(u.commissionRate ?? 0);

    // Each item counts once: for the groomer named on it, else for the order's groomer
    const jobs = delivered.flatMap((o) => {
      const items = o.items.filter((it) => (it.groomerId ?? o.groomerId) === u.id);
      if (items.length === 0) return [];
      const price = round(items.reduce((sum, it) => sum + Number(it.totalPrice), 0));
      return [
        {
          id: o.id,
          orderNumber: o.number,
          petName: o.pet.name,
          breed: o.pet.breed ?? "",
          date: o.deliveredAt!.toLocaleDateString("tr-TR", tz),
          serviceName: items.map((it) => it.name).join(", "),
          price,
          commissionShare: round((price * rate) / 100),
        },
      ];
    });
    const totalRevenue = round(jobs.reduce((sum, j) => sum + j.price, 0));

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      commissionRate: rate,
      isActive: u.isActive,
      completedJobsCount: jobs.length,
      totalRevenue,
      commissionPayout: round((totalRevenue * rate) / 100),
      recentJobs: jobs,
    };
  });

  const thisMonth = new Date().toLocaleDateString("sv-SE", tz).slice(0, 7);
  const next = shiftMonth(month, 1);

  return (
    <PersonelClient
      staffList={staffList}
      deliveredCount={delivered.length}
      monthTitle={parseDayTR(`${month}-01`)!.toLocaleDateString("tr-TR", { month: "long", year: "numeric", ...tz })}
      prevMonth={shiftMonth(month, -1)}
      nextMonth={next <= thisMonth ? next : null}
    />
  );
}
