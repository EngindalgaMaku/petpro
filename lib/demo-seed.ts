import { PrismaClient, Role, ServiceKind, StationType, PetSize, Temperament, WorkStage, ConditionKind, PaymentMethod } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { SIZES } from "./stages";
import { newTrackingToken, newWorkOrderNumber } from "./ids";

/** Removes a salon, everything in it and its uploaded photos */
export async function removeSalon(prisma: PrismaClient, id: string) {
  // Everything that points at a customer first: the database refuses to remove a customer still in use
  await prisma.workOrder.deleteMany({ where: { businessId: id } });
  await prisma.appointment.deleteMany({ where: { businessId: id } });
  await prisma.reminder.deleteMany({ where: { businessId: id } });
  await prisma.pet.deleteMany({ where: { businessId: id } });
  await prisma.business.delete({ where: { id } });
  await rm(path.resolve(process.env.PHOTOS_DIR || "storage/photos", id), { recursive: true, force: true });
}

async function clearDemo(prisma: PrismaClient) {
  const demos = await prisma.business.findMany({
    where: { OR: [{ isDemo: true }, { users: { some: { email: "demo@petpro.com" } } }] },
    select: { id: true },
  });
  for (const { id } of demos) await removeSalon(prisma, id);
}

const hours = (n: number) => n * 3600 * 1000;

/** Replaces the shared demo salon with fresh data dated around today */
export async function seedDemo(prisma: PrismaClient) {
  console.log("🌱 PetPro demo verileri oluşturuluyor...");

  await clearDemo(prisma);

  const business = await prisma.business.create({
    data: {
      isDemo: true,
      name: "Demo Pet Kuaför",
      slug: "demo",
      phone: "02125550000",
      email: "demo@petpro.com",
      address: "Örnek Mahallesi Pati Sokak No:1",
      city: "İstanbul",
      district: "Kadıköy",
      vatRate: 20,
      pricesIncludeVat: true,
    },
  });

  const passwordHash = await bcrypt.hash("12345678", 10);
  const person = (name: string, email: string, phone: string, role: Role, commissionRate?: number) =>
    prisma.user.create({
      data: { businessId: business.id, name, email, phone, passwordHash, role, commissionRate, lastLoginAt: new Date() },
    });
  const owner = await person("Demo Yönetici", "demo@petpro.com", "05321000001", Role.OWNER);
  const selin = await person("Selin Kuaför", "selin@petpro.com", "05321000002", Role.GROOMER, 12);
  const mert = await person("Mert Kuaför", "mert@petpro.com", "05321000003", Role.GROOMER, 15);
  await person("Caner Şoför", "caner@petpro.com", "05321000004", Role.DRIVER);

  const [tub, table1, table2, dryer, catRoom] = await Promise.all(
    [
      { name: "Yıkama Küveti", type: StationType.TUB, sortOrder: 0 },
      { name: "Tıraş Masası 1", type: StationType.TABLE, sortOrder: 1 },
      { name: "Tıraş Masası 2", type: StationType.TABLE, sortOrder: 2 },
      { name: "Kurutma", type: StationType.DRYER, sortOrder: 3 },
      { name: "Kedi Odası", type: StationType.CAT_ROOM, sortOrder: 4 },
    ].map((s) => prisma.station.create({ data: { ...s, businessId: business.id } }))
  );

  await prisma.sizeMultiplier.createMany({
    data: (Object.keys(SIZES) as PetSize[]).map((size) => ({
      businessId: business.id,
      size,
      multiplier: SIZES[size].defaultMultiplier,
    })),
  });

  const service = (
    name: string,
    kind: ServiceKind,
    basePrice: number,
    durationMinutes: number,
    stationType: StationType,
    sortOrder: number,
    extra: { defaultProduct?: string; reminderWeeks?: number } = {}
  ) => prisma.service.create({ data: { businessId: business.id, name, kind, basePrice, durationMinutes, stationType, sortOrder, ...extra } });

  const sBath = await service("Yıkama ve kurutma", ServiceKind.BATH, 600, 60, StationType.TUB, 0, { defaultProduct: "Hipoalerjenik şampuan", reminderWeeks: 4 });
  const sCut = await service("Komple tıraş", ServiceKind.HAIRCUT, 900, 90, StationType.TABLE, 1, { reminderWeeks: 6 });
  const sMats = await service("Keçe açma", ServiceKind.DEMATTING, 500, 60, StationType.TABLE, 2);
  const sNails = await service("Tırnak kesimi", ServiceKind.NAILS, 150, 15, StationType.TABLE, 3);
  const sEars = await service("Kulak temizliği", ServiceKind.EARS, 150, 15, StationType.TABLE, 4);
  const sTeeth = await service("Diş fırçalama", ServiceKind.TEETH, 200, 15, StationType.TABLE, 5);
  const sFlea = await service("Pire ve kene banyosu", ServiceKind.PARASITE, 750, 45, StationType.TUB, 6, { defaultProduct: "Pire ve kene şampuanı" });

  await prisma.servicePackage.create({
    data: {
      businessId: business.id,
      name: "Tam bakım",
      price: 1600,
      sortOrder: 0,
      items: { create: [sBath, sCut, sNails, sEars].map((s) => ({ serviceId: s.id })) },
    },
  });
  await prisma.servicePackage.create({
    data: {
      businessId: business.id,
      name: "Hızlı bakım",
      price: 800,
      sortOrder: 1,
      items: { create: [sBath, sNails, sEars].map((s) => ({ serviceId: s.id })) },
    },
  });

  const owned = async (
    customer: { name: string; phone: string; district: string; notes?: string },
    pet: { name: string; breed: string; size: PetSize; color: string; birthYear: number; temperament?: Temperament; allergies?: string; vaccineDue?: Date }
  ) => {
    const c = await prisma.customer.create({ data: { businessId: business.id, city: "İstanbul", marketingConsent: true, ...customer } });
    const p = await prisma.pet.create({ data: { businessId: business.id, customerId: c.id, ...pet } });
    return { c, p };
  };

  const now = new Date();
  const inMonths = (n: number) => new Date(now.getTime() + n * 30 * 24 * 3600 * 1000);

  const pamuk = await owned(
    { name: "Ayşe Kaya", phone: "05321112233", district: "Kadıköy", notes: "Pamuk'u genelde eşi teslim alıyor." },
    { name: "Pamuk", breed: "Maltese Terrier", size: PetSize.SMALL, color: "Beyaz", birthYear: 2021, allergies: "Parfümlü şampuana hassas", vaccineDue: inMonths(5) }
  );
  const zeytin = await owned(
    { name: "Zeynep Demir", phone: "05332223344", district: "Üsküdar" },
    { name: "Zeytin", breed: "Toy Poodle", size: PetSize.SMALL, color: "Siyah", birthYear: 2022, temperament: Temperament.NERVOUS, vaccineDue: inMonths(2) }
  );
  const pasa = await owned(
    { name: "Burak Yılmaz", phone: "05443334455", district: "Ataşehir", notes: "Pet taksi istiyor." },
    { name: "Paşa", breed: "Chow Chow", size: PetSize.LARGE, color: "Kızıl", birthYear: 2020, temperament: Temperament.BITES, vaccineDue: inMonths(-1) }
  );
  const duman = await owned(
    { name: "Deniz Arslan", phone: "05554445566", district: "Maltepe" },
    { name: "Duman", breed: "British Shorthair", size: PetSize.CAT, color: "Gri", birthYear: 2023, temperament: Temperament.NERVOUS, vaccineDue: inMonths(7) }
  );
  const karamel = await owned(
    { name: "Elif Şahin", phone: "05057778899", district: "Kadıköy" },
    { name: "Karamel", breed: "Golden Retriever", size: PetSize.LARGE, color: "Altın sarısı", birthYear: 2019, vaccineDue: inMonths(9) }
  );

  // One line of an order: the price follows the pet's size class, as at a real intake
  const line = (s: { id: string; name: string; kind: ServiceKind; basePrice: unknown }, size: PetSize, groomerId: string, details?: object) => {
    const multiplier = SIZES[size].defaultMultiplier;
    return {
      serviceId: s.id,
      name: s.name,
      kind: s.kind,
      basePrice: Number(s.basePrice),
      multiplier,
      totalPrice: Math.round(Number(s.basePrice) * multiplier),
      groomerId,
      ...(details && { details }),
    };
  };
  const sum = (items: Array<{ totalPrice: number }>) => items.reduce((n, i) => n + i.totalPrice, 0);
  const trail = (stages: Array<[WorkStage, string, string]>) => ({ create: stages.map(([stage, note, userId]) => ({ stage, note, userId })) });
  const ids = () => ({ businessId: business.id, number: newWorkOrderNumber(), trackingToken: newTrackingToken(), createdById: owner.id });

  // Kabul: muayene kaydı alınmış, sahibinin onayı bekleniyor
  const pamukItems = [
    line(sBath, PetSize.SMALL, selin.id, { product: "Hipoalerjenik şampuan" }),
    line(sCut, PetSize.SMALL, selin.id, { style: "Makas kesimi", lengthMm: 6 }),
    line(sNails, PetSize.SMALL, selin.id),
  ];
  await prisma.workOrder.create({
    data: {
      ...ids(),
      customerId: pamuk.c.id,
      petId: pamuk.p.id,
      stage: WorkStage.RECEIVED,
      stationId: table1.id,
      groomerId: selin.id,
      weightKg: 3.4,
      promisedAt: new Date(now.getTime() + hours(4)),
      totalAmount: sum(pamukItems),
      notes: "Kulak çevresi kısa olmasın.",
      items: { create: pamukItems },
      events: trail([[WorkStage.RECEIVED, "Teslim alındı", owner.id]]),
      payments: { create: [{ amount: 300, method: PaymentMethod.CASH, note: "Kabulde alınan kapora", createdById: owner.id }] },
      inspection: {
        create: {
          createdById: owner.id,
          marks: {
            create: [
              { number: 1, part: "left_ear", kind: ConditionKind.EAR, note: "Kulak içi kirli", x: 0.246, y: 0.106 },
              { number: 2, part: "belly", kind: ConditionKind.MATTED, note: "Küçük keçeler", x: 0.5, y: 0.673 },
            ],
          },
        },
      },
    },
  });

  // Yıkamada
  const zeytinItems = [line(sBath, PetSize.SMALL, selin.id, { product: "Hipoalerjenik şampuan" }), line(sEars, PetSize.SMALL, selin.id)];
  await prisma.workOrder.create({
    data: {
      ...ids(),
      customerId: zeytin.c.id,
      petId: zeytin.p.id,
      stage: WorkStage.BATHING,
      stationId: tub.id,
      groomerId: selin.id,
      weightKg: 2.8,
      promisedAt: new Date(now.getTime() + hours(2)),
      totalAmount: sum(zeytinItems),
      notes: "Fön sesinden korkuyor, düşük devir.",
      items: { create: zeytinItems },
      events: trail([
        [WorkStage.RECEIVED, "Teslim alındı", owner.id],
        [WorkStage.BATHING, "Yıkamaya alındı", selin.id],
      ]),
      payments: { create: [{ amount: sum(zeytinItems), method: PaymentMethod.CARD, note: "Peşin ödeme", createdById: owner.id }] },
      inspection: { create: { createdById: owner.id, customerApprovedAt: new Date(now.getTime() - hours(1)), approvalChannel: "LINK" } },
    },
  });

  // Bakımda
  const dumanItems = [line(sCut, PetSize.CAT, mert.id, { style: "Yaz tıraşı", lengthMm: 4 }), line(sMats, PetSize.CAT, mert.id, { zones: ["Karın", "Bacaklar"] })];
  await prisma.workOrder.create({
    data: {
      ...ids(),
      customerId: duman.c.id,
      petId: duman.p.id,
      stage: WorkStage.GROOMING,
      stationId: catRoom.id,
      groomerId: mert.id,
      weightKg: 4.9,
      promisedAt: new Date(now.getTime() + hours(1.5)),
      totalAmount: sum(dumanItems),
      items: { create: dumanItems },
      events: trail([
        [WorkStage.RECEIVED, "Teslim alındı", owner.id],
        [WorkStage.GROOMING, "Bakıma alındı", mert.id],
      ]),
      inspection: { create: { createdById: owner.id } },
    },
  });

  // Teslime hazır, pet taksi ile gidecek
  const pasaItems = [
    line(sBath, PetSize.LARGE, mert.id, { product: "Hipoalerjenik şampuan" }),
    line(sMats, PetSize.LARGE, mert.id, { zones: ["Boyun", "Göğüs", "Kuyruk"] }),
    line(sNails, PetSize.LARGE, mert.id),
  ];
  await prisma.workOrder.create({
    data: {
      ...ids(),
      customerId: pasa.c.id,
      petId: pasa.p.id,
      stage: WorkStage.READY,
      stationId: dryer.id,
      groomerId: mert.id,
      weightKg: 31,
      taxiDropoff: true,
      promisedAt: new Date(now.getTime() - hours(0.5)),
      totalAmount: sum(pasaItems),
      notes: "Ağızlıkla çalışıldı. Sahibi arandı, pet taksi çıkacak.",
      items: { create: pasaItems },
      events: trail([
        [WorkStage.RECEIVED, "Teslim alındı", owner.id],
        [WorkStage.BATHING, "Yıkandı", mert.id],
        [WorkStage.GROOMING, "Keçeler açıldı", mert.id],
        [WorkStage.QUALITY_CHECK, "Son kontrol tamam", owner.id],
        [WorkStage.READY, "Teslime hazır", mert.id],
      ]),
      payments: { create: [{ amount: 500, method: PaymentMethod.CARD, note: "Kabulde alınan kapora", createdById: owner.id }] },
      inspection: { create: { createdById: owner.id } },
    },
  });

  // Teslim edilenler: bakım karnesi, prim ve geçmiş ekranları boş kalmasın
  const deliveredToday = new Date(now.getTime() - hours(3));
  const deliveredBefore = new Date(now.getTime() - hours(24 * 42));
  const delivered = async (when: Date, groomerId: string, items: ReturnType<typeof line>[], method: PaymentMethod) =>
    prisma.workOrder.create({
      data: {
        ...ids(),
        customerId: karamel.c.id,
        petId: karamel.p.id,
        stage: WorkStage.DELIVERED,
        stationId: table2.id,
        groomerId,
        weightKg: 29.5,
        totalAmount: sum(items),
        createdAt: new Date(when.getTime() - hours(3)),
        deliveredAt: when,
        items: { create: items },
        events: trail([
          [WorkStage.RECEIVED, "Teslim alındı", owner.id],
          [WorkStage.DELIVERED, "Sahibine teslim edildi", owner.id],
        ]),
        payments: { create: [{ amount: sum(items), method, paidAt: when, createdById: owner.id }] },
      },
    });
  await delivered(
    deliveredToday,
    selin.id,
    [
      line(sBath, PetSize.LARGE, selin.id, { product: "Hipoalerjenik şampuan" }),
      line(sCut, PetSize.LARGE, selin.id, { style: "Yaz tıraşı", lengthMm: 10 }),
      line(sTeeth, PetSize.LARGE, selin.id),
    ],
    PaymentMethod.CARD
  );
  await delivered(deliveredBefore, mert.id, [line(sFlea, PetSize.LARGE, mert.id, { product: "Pire ve kene şampuanı" }), line(sNails, PetSize.LARGE, mert.id)], PaymentMethod.CASH);

  // Randevular: bugün 14.00 ve 17.00 (Türkiye saati)
  const at = (h: number, m = 0) => {
    const d = new Date(now);
    d.setUTCHours(h - 3, m, 0, 0);
    return d;
  };
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: karamel.c.id,
      petId: karamel.p.id,
      stationId: table2.id,
      title: "Karamel, tırnak ve kulak",
      startsAt: at(14),
      endsAt: at(14, 30),
      status: "BOOKED",
    },
  });
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      customerId: zeytin.c.id,
      petId: zeytin.p.id,
      stationId: table1.id,
      title: "Zeytin, komple tıraş",
      startsAt: at(17),
      endsAt: at(18, 30),
      status: "BOOKED",
      notes: "Son saatte gelmek istedi, sakin olsun diye.",
    },
  });

  // Online talep: salon onayını bekliyor. Yarın 11.00, Tıraş Masası 2
  const tomorrow = new Date(at(11).getTime() + hours(24));
  await prisma.appointment.create({
    data: {
      businessId: business.id,
      stationId: table2.id,
      title: "Bulut · Komple tıraş",
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + hours(1.5)),
      status: "REQUESTED",
      notes: "İlk kez geliyoruz, biraz ürkek.",
      request: { name: "Merve Aydın", phone: "05551234567", petName: "Bulut", breed: "Pomeranian", size: PetSize.SMALL },
    },
  });

  // Hatırlatmalar: Bugün ekranında zamanı gelenler
  await prisma.reminder.create({
    data: {
      businessId: business.id,
      customerId: pamuk.c.id,
      petId: pamuk.p.id,
      title: "Komple tıraş zamanı",
      dueAt: new Date(now.getTime() + hours(24 * 3)),
      status: "PENDING",
    },
  });
  await prisma.reminder.create({
    data: {
      businessId: business.id,
      customerId: karamel.c.id,
      petId: karamel.p.id,
      title: "Yıkama ve kurutma zamanı",
      dueAt: new Date(now.getTime() + hours(24 * 6)),
      status: "PENDING",
    },
  });

  // Kasa giderleri
  await prisma.expense.createMany({
    data: [
      { businessId: business.id, amount: 3200, category: "SUPPLIES", description: "Şampuan ve havlu", method: PaymentMethod.CARD, spentAt: new Date(now.getTime() - hours(48)), createdById: owner.id },
      { businessId: business.id, amount: 1800, category: "EQUIPMENT", description: "Tıraş makinesi bıçağı bileme", method: PaymentMethod.CASH, spentAt: new Date(now.getTime() - hours(24)), createdById: owner.id },
      { businessId: business.id, amount: 1400, category: "UTILITIES", description: "Elektrik ve su", method: PaymentMethod.BANK_TRANSFER, spentAt: now, createdById: owner.id },
      { businessId: business.id, amount: 650, category: "VEHICLE", description: "Pet taksi yakıtı", method: PaymentMethod.CASH, spentAt: now, createdById: owner.id },
    ],
  });

  console.log("✅ PetPro demo verileri oluşturuldu");
}
