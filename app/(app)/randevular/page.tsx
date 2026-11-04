import { Prisma, type PetSize } from "@prisma/client";
import type { BookingRequest } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { dayKeyTR, parseDayTR, startOfDayTR, addDays } from "@/lib/turkey-time";
import { SIZES } from "@/lib/stages";
import { BookingRequests, type RequestRow } from "./booking-requests";
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

  // A request nobody answered in time holds nothing and keeps no one's details
  await prisma.appointment.updateMany({
    where: { businessId: user.businessId, status: "REQUESTED", startsAt: { lt: new Date() } },
    data: { status: "CANCELLED", request: Prisma.DbNull },
  });

  const [appointments, stations, services, waiting] = await Promise.all([
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
    prisma.appointment.findMany({
      where: { businessId: user.businessId, status: "REQUESTED" },
      orderBy: { startsAt: "asc" },
      include: { station: { select: { name: true } } },
    }),
  ]);

  const requests: RequestRow[] = waiting.map((a) => {
    const r = a.request as unknown as BookingRequest;
    return {
      id: a.id,
      title: a.title,
      when: a.startsAt.toLocaleString("tr-TR", { day: "numeric", month: "long", weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
      stationName: a.station?.name ?? null,
      notes: a.notes,
      name: r.name,
      phone: r.phone,
      petName: r.petName,
      detail: [r.breed, SIZES[r.size as PetSize].label].filter(Boolean).join(" · "),
    };
  });

  const appsMapped: CalendarAppointment[] = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    status: a.status,
    stationId: a.stationId,
    stationName: a.station?.name ?? null,
    customerName: a.customer?.name ?? (a.request as unknown as BookingRequest | null)?.name ?? null,
    customerPhone: a.customer?.phone ?? (a.request as unknown as BookingRequest | null)?.phone ?? null,
    petName: a.pet?.name ?? (a.request as unknown as BookingRequest | null)?.petName ?? null,
    breed: a.pet?.breed ?? (a.request as unknown as BookingRequest | null)?.breed ?? null,
    notes: a.notes,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 md:px-8">
      <BookingRequests requests={requests} businessName={user.business.name} />
      <CalendarView
        dateKey={dateKey}
        appointments={appsMapped}
        stations={stations}
        services={services}
      />
    </div>
  );
}
