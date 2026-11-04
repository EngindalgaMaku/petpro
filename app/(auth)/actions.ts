"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ServiceKind, StationType, PetSize } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ENTRY_DAYS } from "@/lib/plan";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { endSession, startSession } from "@/lib/session";
import { sessionSecretProblem } from "@/lib/session-secret";
import { SIZES } from "@/lib/stages";

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
}

// A new salon starts with the usual floor plan and service names. Prices are left empty:
// they are the salon's own, so the owner sets them (Bugün shows a reminder for missing prices)
const STARTER_STATIONS: Array<{ name: string; type: StationType }> = [
  { name: "Yıkama küveti", type: "TUB" },
  { name: "Tıraş masası", type: "TABLE" },
  { name: "Kurutma", type: "DRYER" },
];

const STARTER_SERVICES: Array<{
  name: string;
  kind: ServiceKind;
  durationMinutes: number;
  stationType: StationType;
  reminderWeeks?: number;
}> = [
  { name: "Yıkama ve kurutma", kind: "BATH", durationMinutes: 60, stationType: "TUB", reminderWeeks: 4 },
  { name: "Komple tıraş", kind: "HAIRCUT", durationMinutes: 90, stationType: "TABLE", reminderWeeks: 6 },
  { name: "Keçe açma", kind: "DEMATTING", durationMinutes: 60, stationType: "TABLE" },
  { name: "Tırnak kesimi", kind: "NAILS", durationMinutes: 15, stationType: "TABLE" },
  { name: "Kulak temizliği", kind: "EARS", durationMinutes: 15, stationType: "TABLE" },
  { name: "Diş fırçalama", kind: "TEETH", durationMinutes: 15, stationType: "TABLE" },
  { name: "Pire ve kene banyosu", kind: "PARASITE", durationMinutes: 45, stationType: "TUB" },
];

const signUpSchema = z.object({
  businessName: z.string().trim().min(2, "İşletme adını yazın").max(100),
  name: z.string().trim().min(2, "Adınızı yazın").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yazın"),
  phone: z.string().refine(isValidPhone, "Cep telefonunu 05XX XXX XX XX biçiminde yazın"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(128),
  terms: z.literal("on", { errorMap: () => ({ message: "Kullanım şartlarını ve KVKK metnini onaylayın" }) }),
});

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  if (sessionSecretProblem()) return { error: SIGN_IN_OFF };
  const fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = signUpSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { ...fields, password: "" } };
  const data = parsed.data;

  if (await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    return { error: "Bu e-posta ile bir hesap var; giriş yapın", fields: { ...fields, password: "" } };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { name: data.businessName, phone: normalizePhone(data.phone), entryEndsAt: new Date(Date.now() + ENTRY_DAYS * 24 * 3600 * 1000) },
    });
    await tx.station.createMany({
      data: STARTER_STATIONS.map((s, i) => ({ ...s, businessId: business.id, sortOrder: i })),
    });
    await tx.sizeMultiplier.createMany({
      data: (Object.keys(SIZES) as PetSize[]).map((size) => ({
        businessId: business.id,
        size,
        multiplier: SIZES[size].defaultMultiplier,
      })),
    });
    await tx.service.createMany({
      data: STARTER_SERVICES.map((s, i) => ({ ...s, businessId: business.id, basePrice: 0, sortOrder: i })),
    });
    return tx.user.create({
      data: {
        businessId: business.id,
        name: data.name,
        email: data.email,
        phone: normalizePhone(data.phone),
        passwordHash,
        role: "OWNER",
        lastLoginAt: new Date(),
      },
    });
  });

  await startSession({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/bugun");
}

// Wrong passwords per e-mail, in memory: enough to slow down guessing on one server
const failures = new Map<string, { count: number; until: number }>();
const SIGN_IN_OFF = "Sunucu ayarı eksik olduğu için şu an giriş yapılamıyor.";
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  if (sessionSecretProblem()) return { error: SIGN_IN_OFF };
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const fields = { email };

  const lock = failures.get(email);
  if (lock && lock.count >= LOCK_AFTER && lock.until > Date.now()) {
    return { error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.", fields };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) {
    const current = lock && lock.until > Date.now() ? lock.count : 0;
    failures.set(email, { count: current + 1, until: Date.now() + LOCK_MS });
    return { error: "E-posta veya şifre hatalı", fields };
  }

  failures.delete(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/bugun");
}

export async function signOut() {
  await endSession();
  redirect("/");
}
