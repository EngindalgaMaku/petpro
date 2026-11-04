// Browser side of photo uploads: phone cameras give 4–12 MB pictures, so each is scaled to at
// most 1600 px and re-encoded as JPEG before it leaves the device (also drops location data).

const MAX_SIDE = 1600;

async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.82)
    );
  } catch {
    return file; // a format the browser cannot draw: the server decides whether it is accepted
  }
}

export async function uploadPhoto(
  file: File,
  fields: { workOrderId: string; kind: "CONDITION" | "BEFORE" | "AFTER"; conditionMarkId?: string }
): Promise<{ id: string } | { error: string }> {
  const form = new FormData();
  form.append("file", await shrink(file), "photo.jpg");
  form.append("workOrderId", fields.workOrderId);
  form.append("kind", fields.kind);
  if (fields.conditionMarkId) form.append("conditionMarkId", fields.conditionMarkId);
  const response = await fetch("/api/photos", { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  return response.ok ? { id: data.id } : { error: data.error || "Fotoğraf yüklenemedi" };
}
