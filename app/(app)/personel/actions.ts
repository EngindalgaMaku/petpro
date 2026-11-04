"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DEMO_LOCKED } from "@/lib/demo";
import { prisma } from "@/lib/db";
import { planOf } from "@/lib/plan";
import { requireUser } from "@/lib/session";
import type { Role } from "@prisma/client";

const CreateStaffSchema = z.object({
  name: z.string().trim().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().trim().email("Geçerli bir e-posta adresi girin"),
  phone: z.string().trim().optional(),
  role: z.enum(["GROOMER", "DRIVER", "MANAGER"] as const),
  commissionRate: z.number().min(0).max(100).default(0),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export async function createStaff(formData: FormData) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER" && user.role !== "MANAGER") {
      return { error: "Yetkisiz işlem. Yalnızca işletme sahibi veya yönetici personel ekleyebilir." };
    }
    if (user.business.isDemo) return { error: DEMO_LOCKED };
    if (planOf(user.business).level === "RESTRICTED") return { error: "Kısıtlı modda yeni personel eklenemez. Tam kullanım için bize yazın." };

    const raw = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? "").toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      role: String(formData.get("role") ?? "GROOMER") as Role,
      commissionRate: Number(formData.get("commissionRate") ?? 0),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = CreateStaffSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Geçersiz form verisi" };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return { error: "Bu e-posta adresiyle kayıtlı bir kullanıcı zaten mevcut." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.user.create({
      data: {
        businessId: user.businessId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        role: parsed.data.role,
        commissionRate: parsed.data.commissionRate,
        passwordHash,
        isActive: true,
      },
    });

    revalidatePath("/personel");
    return { success: true };
  } catch (err) {
    console.error("createStaff error:", err);
    return { error: "Personel eklenirken bir hata meydana geldi." };
  }
}

export async function updateCommissionRate(userId: string, commissionRate: number) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER" && user.role !== "MANAGER") {
      return { error: "Yetkisiz işlem." };
    }

    if (commissionRate < 0 || commissionRate > 100) {
      return { error: "Prim oranı %0 ile %100 arasında olmalıdır." };
    }

    await prisma.user.updateMany({
      where: { id: userId, businessId: user.businessId },
      data: { commissionRate },
    });

    revalidatePath("/personel");
    return { success: true };
  } catch (err) {
    console.error("updateCommissionRate error:", err);
    return { error: "Prim oranı güncellenirken bir hata meydana geldi." };
  }
}

export async function toggleStaffStatus(userId: string, isActive: boolean) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER" && user.role !== "MANAGER") {
      return { error: "Yetkisiz işlem." };
    }

    if (user.business.isDemo) return { error: DEMO_LOCKED };

    if (userId === user.id) {
      return { error: "Kendi hesabınızı pasife alamazsınız." };
    }

    await prisma.user.updateMany({
      where: { id: userId, businessId: user.businessId },
      data: { isActive },
    });

    revalidatePath("/personel");
    return { success: true };
  } catch (err) {
    console.error("toggleStaffStatus error:", err);
    return { error: "Personel durumu güncellenemedi." };
  }
}
