import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { dayKeyTR, parseDayTR, startOfDayTR, addDays } from "@/lib/turkey-time";
import { CalendarView, type CalendarAppointment } from "./calendar-view";

export const metadata = { title: "Randevu Takvimi" };
export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tarih?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const todayKey = dayKeyTR(new Date());
  const dateKey = sp.tarih && /^\d{4}-\d{2}-\d{2}$/.test(sp.tarih) ? sp.tarih : todayKey;

  const dayStart = parseDayTR(dateKey) ?? startOfDayTR();
  const dayEnd = addDays(dayStart, 1);

  const [appointments, stations, services] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: user.businessId,
        startsAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { startsAt: "asc" },
      include: {
        station: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        pet: { select: { name: true, breed: true, size: true } },
      },
    }),
    prisma.station.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, type: true },
    }),
    prisma.service.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, durationMinutes: true },
    }),
  ]);

  const appsMapped: CalendarAppointment[] = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    stationId: a.stationId,
    stationName: a.station?.name ?? null,
    customerName: a.customer?.name ?? null,
    customerPhone: a.customer?.phone ?? null,
    petName: a.pet?.name ?? null,
    breed: a.pet?.breed ?? null,
    notes: a.notes,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8">
      <CalendarView
        dateKey={dateKey}
        appointments={appsMapped}
        stations={stations}
        services={services}
      />
    </div>
  );
}
