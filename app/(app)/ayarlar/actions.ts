"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEMO_LOCKED } from "@/lib/demo";
import { prisma } from "@/lib/db";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { canManage, requireUser } from "@/lib/session";

export interface SettingsState {
  error?: string;
  success?: string;
}

const businessSchema = z.object({
  name: z.string().trim().min(2, "İşletme adı en az 2 karakter olmalıdır").max(100),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Geçerli bir e-posta girin").or(z.literal("")).optional(),
  taxNumber: z.string().trim().max(30).optional(),
  address: z.string().trim().max(250).optional(),
  city: z.string().trim().max(50).optional(),
  district: z.string().trim().max(50).optional(),
  vatRate: z.coerce.number().min(0).max(100).default(20),
});

export async function updateBusiness(prev: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (!canManage(user.role)) return { error: "İşletme bilgilerini güncelleme yetkiniz yok." };
  if (user.business.isDemo) return { error: DEMO_LOCKED };

  const parsed = businessSchema.safeParse({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email"),
    taxNumber: form.get("taxNumber"),
    address: form.get("address"),
    city: form.get("city"),
    district: form.get("district"),
    vatRate: form.get("vatRate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const d = parsed.data;
  await prisma.business.update({
    where: { id: user.businessId },
    data: {
      name: d.name,
      phone: d.phone ? normalizePhone(d.phone) : null,
      email: d.email || null,
      taxNumber: d.taxNumber || null,
      address: d.address || null,
      city: d.city || null,
      district: d.district || null,
      vatRate: d.vatRate,
    },
  });

  revalidatePath("/ayarlar");
  revalidatePath("/(app)", "layout");
  return { success: "İşletme bilgileri başarıyla güncellendi." };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi girin"),
  newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır"),
  confirmPassword: z.string().min(1, "Yeni şifreyi tekrar girin"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Yeni şifreler birbiriyle eşleşmiyor",
  path: ["confirmPassword"],
});

export async function changePassword(prev: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (user.business.isDemo) return { error: DEMO_LOCKED };

  const parsed = passwordSchema.safeParse({
    currentPassword: form.get("currentPassword"),
    newPassword: form.get("newPassword"),
    confirmPassword: form.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser) return { error: "Kullanıcı bulunamadı." };

  const match = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!match) return { error: "Mevcut şifreniz hatalı." };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: "Şifreniz başarıyla değiştirildi." };
}

const stationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "İstasyon adı en az 2 karakter olmalıdır").max(50),
  type: z.enum(["TUB", "TABLE", "DRYER", "CAT_ROOM"]),
});

export async function saveStation(form: FormData): Promise<{ error?: string; success?: string }> {
  const user = await requireUser();
  if (!canManage(user.role)) return { error: "İstasyonları yönetme yetkiniz yok." };

  const parsed = stationSchema.safeParse({
    id: form.get("id") ? String(form.get("id")) : undefined,
    name: form.get("name"),
    type: form.get("type"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, name, type } = parsed.data;

  if (id) {
    const existing = await prisma.station.findFirst({
      where: { id, businessId: user.businessId },
    });
    if (!existing) return { error: "İstasyon bulunamadı." };

    await prisma.station.update({
      where: { id },
      data: { name, type },
    });
  } else {
    const maxSort = await prisma.station.aggregate({
      where: { businessId: user.businessId },
      _max: { sortOrder: true },
    });
    const nextSort = (maxSort._max.sortOrder ?? 0) + 1;

    await prisma.station.create({
      data: {
        businessId: user.businessId,
        name,
        type,
        sortOrder: nextSort,
      },
    });
  }

  revalidatePath("/ayarlar");
  revalidatePath("/salon");
  revalidatePath("/kabul");
  return { success: id ? "İstasyon güncellendi." : "Yeni istasyon eklendi." };
}

export async function deleteStation(id: string): Promise<{ error?: string; success?: string }> {
  const user = await requireUser();
  if (!canManage(user.role)) return { error: "İstasyon silme yetkiniz yok." };

  const existing = await prisma.station.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      workOrders: { where: { stage: { notIn: ["READY", "DELIVERED", "TAXI_DELIVERY", "CANCELLED"] } } },
    },
  });

  if (!existing) return { error: "İstasyon bulunamadı." };

  if (existing.workOrders.length > 0) {
    return { error: "Bu istasyonda şu an bakımda olan hayvanlar var. Önce başka bir istasyona taşıyın." };
  }

  await prisma.station.delete({ where: { id } });

  revalidatePath("/ayarlar");
  revalidatePath("/salon");
  revalidatePath("/kabul");
  return { success: "İstasyon başarıyla silindi." };
}
