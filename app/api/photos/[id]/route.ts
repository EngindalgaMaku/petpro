import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mimeFor, readPhoto } from "@/lib/photos";
import { readSession } from "@/lib/session";

/**
 * One photo. The salon sees its own photos; the customer sees the photos of their pet
 * with the tracking link's key (?t=…), which is what the tracking page passes.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { path: true, businessId: true, workOrder: { select: { trackingToken: true } } },
  });
  if (!photo) return new NextResponse("Bulunamadı", { status: 404 });

  const token = request.nextUrl.searchParams.get("t");
  const session = token ? null : await readSession();
  const allowed = token ? token === photo.workOrder.trackingToken : session?.businessId === photo.businessId;
  if (!allowed) return new NextResponse("Bulunamadı", { status: 404 });

  try {
    const bytes = await readPhoto(photo.path);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeFor(photo.path),
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Bulunamadı", { status: 404 });
  }
}
