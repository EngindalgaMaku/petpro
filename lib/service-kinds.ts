import { z } from "zod";
import type { ServiceKind } from "@prisma/client";

// Kinds of grooming work and the details each records on a work order item. The intake asks
// for these; the next visit and the customer's care card show them back.

export const KINDS: Record<ServiceKind, { label: string; hint: string }> = {
  BATH: { label: "Yıkama", hint: "Şampuan kaydedilir" },
  HAIRCUT: { label: "Tıraş", hint: "Kesim ve uzunluk kaydedilir" },
  DEMATTING: { label: "Keçe açma", hint: "Bölgeler kaydedilir" },
  NAILS: { label: "Tırnak", hint: "Ek ayrıntı yok" },
  EARS: { label: "Kulak temizliği", hint: "Ek ayrıntı yok" },
  TEETH: { label: "Diş fırçalama", hint: "Ek ayrıntı yok" },
  PARASITE: { label: "Pire ve kene banyosu", hint: "Ürün kaydedilir" },
  OTHER: { label: "Diğer", hint: "Ek ayrıntı yok" },
};

/** Kinds that use a shampoo or product, filled in from the service's default */
export const PRODUCT_KINDS: ServiceKind[] = ["BATH", "PARASITE"];

export const CUT_STYLES = ["Makine tıraşı", "Makas kesimi", "Yaz tıraşı", "Puppy kesim", "Irk standardı", "Yalnız düzeltme"] as const;

export const BODY_ZONES = ["Baş", "Kulaklar", "Boyun", "Sırt", "Göğüs", "Karın", "Bacaklar", "Kuyruk"] as const;

const text = z.string().trim().max(80).optional();

export const DETAIL_SCHEMAS = {
  BATH: z.object({ product: text }),
  PARASITE: z.object({ product: text }),
  HAIRCUT: z.object({
    style: z.enum(CUT_STYLES).optional(),
    lengthMm: z.number().int().min(1).max(100).optional(),
  }),
  DEMATTING: z.object({ zones: z.array(z.enum(BODY_ZONES)).max(BODY_ZONES.length).optional() }),
} as const;

export type ItemDetails = {
  product?: string;
  style?: (typeof CUT_STYLES)[number];
  lengthMm?: number;
  zones?: string[];
};

/** Checks the details for a kind; kinds without details store none */
export function parseDetails(kind: ServiceKind, value: unknown): ItemDetails | null {
  const schema = DETAIL_SCHEMAS[kind as keyof typeof DETAIL_SCHEMAS];
  if (!schema) return null;
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) throw new Error("Hizmet ayrıntıları geçersiz");
  const clean = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));
  return Object.keys(clean).length ? (clean as ItemDetails) : null;
}

/** One line for cards, receipts and the care card: "Makas kesimi · 6 mm" */
export function detailSummary(kind: ServiceKind, details: ItemDetails | null | undefined) {
  if (!details) return "";
  const parts: string[] = [];
  if (details.product) parts.push(details.product);
  if (details.style) parts.push(details.style);
  if (details.lengthMm) parts.push(`${details.lengthMm} mm`);
  if (details.zones?.length) parts.push(details.zones.join(", "));
  return parts.join(" · ");
}
