import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Work-order photos live on disk under PHOTOS_DIR (a persistent volume in Coolify), one
// folder per business and work order. Only the path is in the database.

const ROOT = path.resolve(process.env.PHOTOS_DIR || "storage/photos");
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const TYPES = [
  { ext: "jpg", mime: "image/jpeg", test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", test: (b: Buffer) => b.subarray(0, 4).toString("hex") === "89504e47" },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b: Buffer) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** The image type from the file's first bytes (the declared type and name are not trusted) */
export const sniff = (bytes: Buffer) => TYPES.find((t) => t.test(bytes)) ?? null;

export const mimeFor = (file: string) => TYPES.find((t) => file.endsWith(`.${t.ext}`))?.mime ?? "application/octet-stream";

/** Saves the image and returns its path relative to the photo root */
export async function savePhoto(bytes: Buffer, businessId: string, workOrderId: string) {
  const type = sniff(bytes);
  if (!type) throw new Error("Yalnızca JPEG, PNG veya WebP fotoğraf yüklenebilir");
  const rel = path.posix.join(businessId, workOrderId, `${randomBytes(12).toString("hex")}.${type.ext}`);
  const abs = path.join(ROOT, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
  return rel;
}

function resolve(rel: string) {
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep)) throw new Error("Geçersiz fotoğraf yolu");
  return abs;
}

export const readPhoto = (rel: string) => readFile(resolve(rel));

export async function removePhoto(rel: string) {
  await rm(resolve(rel), { force: true });
}
