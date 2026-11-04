// Expense categories of a grooming salon. Stored as the key.

export const EXPENSE_CATEGORIES = {
  SUPPLIES: "Şampuan ve sarf malzeme",
  WAGES: "Personel",
  RENT: "Kira",
  UTILITIES: "Elektrik, su, doğalgaz",
  EQUIPMENT: "Ekipman ve bakım",
  VEHICLE: "Pet taksi ve yakıt",
  FOOD: "Yemek",
  TAX: "Vergi ve SGK",
  OTHER: "Diğer",
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export const isExpenseCategory = (v: unknown): v is ExpenseCategory => typeof v === "string" && v in EXPENSE_CATEGORIES;

export const expenseLabel = (k: string) => EXPENSE_CATEGORIES[k as ExpenseCategory] ?? k;

export const METHOD_LABELS: Record<string, string> = { CASH: "Nakit", CARD: "Kart", BANK_TRANSFER: "Havale" };
