// What a business may do. New sign-ups start at the entry level with everything open; when it
// runs out the business drops to restricted mode instead of being closed, and keeps its records.
// Restricted mode also closes online booking. A paid period is set by hand from /yonetim. The public demo business is outside all of this.

export const ENTRY_DAYS = 30;
export const ENTRY_PHOTOS_PER_BUSINESS = 2000;
export const RESTRICTED_ORDERS_PER_30_DAYS = 10;

const SALES_WHATSAPP = "905465867927";
const DAY = 24 * 3600 * 1000;

export type PlanLevel = "DEMO" | "ENTRY" | "PAID" | "RESTRICTED";

export interface PlanBusiness {
  isDemo: boolean;
  createdAt: Date;
  entryEndsAt: Date | null;
  paidUntil: Date | null;
}

/** Businesses that signed up before plans existed count from their sign-up day */
export const entryEnd = (b: PlanBusiness) => b.entryEndsAt ?? new Date(b.createdAt.getTime() + ENTRY_DAYS * DAY);

export function planOf(b: PlanBusiness, now = new Date()): { level: PlanLevel; daysLeft: number } {
  if (b.isDemo) return { level: "DEMO", daysLeft: 0 };
  const left = (until: Date) => Math.ceil((until.getTime() - now.getTime()) / DAY);
  if (b.paidUntil && b.paidUntil > now) return { level: "PAID", daysLeft: left(b.paidUntil) };
  const end = entryEnd(b);
  if (end > now) return { level: "ENTRY", daysLeft: left(end) };
  return { level: "RESTRICTED", daysLeft: 0 };
}

export const planLabel: Record<PlanLevel, string> = {
  DEMO: "Demo",
  ENTRY: "Giriş seviyesi",
  PAID: "Ücretli",
  RESTRICTED: "Kısıtlı mod",
};

export const RESTRICTED_MESSAGE = "Kısıtlı moddasınız. Tam kullanım için bize yazın.";

export const upgradeLink = (appName: string, businessName: string) =>
  `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(`Merhaba, ${appName} programını tam olarak kullanmaya devam etmek istiyorum. İşletmem: ${businessName}`)}`;
