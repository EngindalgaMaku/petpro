import { NextRequest, NextResponse } from "next/server";
import { PhotoKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEMO_MAX_PHOTO_BYTES, DEMO_PHOTOS_PER_BUSINESS } from "@/lib/demo";
import { MAX_PHOTO_BYTES, savePhoto } from "@/lib/photos";
import { ENTRY_PHOTOS_PER_BUSINESS, planOf } from "@/lib/plan";
import { readSession } from "@/lib/session";

/** Upload one photo of a work order: intake check (tied to a mark), before or after */
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const workOrderId = String(form?.get("workOrderId") ?? "");
  const kind = String(form?.get("kind") ?? "") as PhotoKind;
  const conditionMarkId = String(form?.get("conditionMarkId") ?? "") || null;

  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "Fotoğraf seçilmedi" }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Fotoğraf 8 MB'tan büyük" }, { status: 413 });
  if (!Object.values(PhotoKind).includes(kind)) return NextResponse.json({ error: "Geçersiz fotoğraf türü" }, { status: 400 });

  const order = await prisma.workOrder.findFirst({
    where: { id: workOrderId, businessId: session.businessId },
    select: {
      id: true,
      businessId: true,
      inspection: { select: { id: true } },
      business: { select: { isDemo: true, createdAt: true, entryEndsAt: true, paidUntil: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "İş emri bulunamadı" }, { status: 404 });
  if (conditionMarkId) {
    const mark = await prisma.conditionMark.count({ where: { id: conditionMarkId, inspectionId: order.inspection?.id ?? "-" } });
    if (!mark) return NextResponse.json({ error: "İşaret bulunamadı" }, { status: 404 });
  }

  const plan = planOf(order.business);
  if (plan.level === "RESTRICTED") return NextResponse.json({ error: "Kısıtlı modda fotoğraf eklenemez. Tam kullanım için bize yazın." }, { status: 403 });
  if (plan.level === "DEMO" && file.size > DEMO_MAX_PHOTO_BYTES) return NextResponse.json({ error: "Demoda fotoğraf en fazla 3 MB olabilir" }, { status: 413 });
  const own = await prisma.photo.count({ where: { businessId: order.businessId } });
  if (own >= (plan.level === "DEMO" ? DEMO_PHOTOS_PER_BUSINESS : ENTRY_PHOTOS_PER_BUSINESS)) {
    return NextResponse.json({ error: "Fotoğraf sınırına ulaşıldı" }, { status: 429 });
  }

  try {
    const rel = await savePhoto(Buffer.from(await file.arrayBuffer()), order.businessId, order.id);
    const photo = await prisma.photo.create({
      data: { businessId: order.businessId, workOrderId: order.id, conditionMarkId, kind, path: rel },
      select: { id: true },
    });
    return NextResponse.json({ id: photo.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fotoğraf kaydedilemedi" }, { status: 400 });
  }
}
