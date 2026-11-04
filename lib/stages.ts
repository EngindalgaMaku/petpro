import type { PetSize, WorkStage } from "@prisma/client";

// Labels and order of the work-order stages (prisma WorkStage) and pet size classes,
// shared by the board, the work order screen and the customer's tracking page.

export const STAGES: Record<WorkStage, { label: string; customerLabel: string }> = {
  RECEIVED: { label: "Kabul", customerLabel: "Teslim alındı" },
  BATHING: { label: "Yıkama", customerLabel: "Yıkanıyor" },
  GROOMING: { label: "Tıraş ve bakım", customerLabel: "Bakımda" },
  QUALITY_CHECK: { label: "Son kontrol", customerLabel: "Son kontrolde" },
  READY: { label: "Teslime hazır", customerLabel: "Hazır" },
  TAXI_DELIVERY: { label: "Pet taksi yolda", customerLabel: "Size getiriliyor" },
  DELIVERED: { label: "Teslim edildi", customerLabel: "Teslim edildi" },
  CANCELLED: { label: "İptal", customerLabel: "İptal edildi" },
};

/** Board columns, in work order (delivered and cancelled orders leave the board) */
export const BOARD_STAGES: WorkStage[] = ["RECEIVED", "BATHING", "GROOMING", "QUALITY_CHECK", "READY"];

export const SIZES: Record<PetSize, { label: string; hint: string; defaultMultiplier: number }> = {
  CAT: { label: "Kedi", hint: "", defaultMultiplier: 1.1 },
  SMALL: { label: "Küçük köpek", hint: "10 kg'a kadar", defaultMultiplier: 1 },
  MEDIUM: { label: "Orta köpek", hint: "10–25 kg", defaultMultiplier: 1.3 },
  LARGE: { label: "Büyük köpek", hint: "25–40 kg", defaultMultiplier: 1.6 },
  GIANT: { label: "Dev köpek", hint: "40 kg üstü", defaultMultiplier: 2 },
};

/** Moves the salon can make from each stage (a check can send a pet back for more work) */
export const TRANSITIONS: Record<WorkStage, WorkStage[]> = {
  RECEIVED: ["BATHING", "GROOMING", "QUALITY_CHECK", "CANCELLED"],
  BATHING: ["GROOMING", "QUALITY_CHECK", "CANCELLED"],
  GROOMING: ["QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["READY", "GROOMING", "CANCELLED"],
  READY: ["DELIVERED", "TAXI_DELIVERY", "QUALITY_CHECK"],
  TAXI_DELIVERY: ["DELIVERED", "READY"],
  DELIVERED: [],
  CANCELLED: [],
};

export const canMove = (from: WorkStage, to: WorkStage) => TRANSITIONS[from].includes(to);

/**
 * The one button that moves an order on. A bath-only order skips the grooming stage, since
 * nothing happens there for it.
 */
export function nextStage(stage: WorkStage, needsGrooming: boolean): { target: WorkStage; label: string } | null {
  switch (stage) {
    case "RECEIVED":
      return { target: "BATHING", label: "Yıkamaya al" };
    case "BATHING":
      return needsGrooming ? { target: "GROOMING", label: "Bakıma al" } : { target: "QUALITY_CHECK", label: "Son kontrole al" };
    case "GROOMING":
      return { target: "QUALITY_CHECK", label: "Son kontrole al" };
    case "QUALITY_CHECK":
      return { target: "READY", label: "Hazır" };
    case "READY":
    case "TAXI_DELIVERY":
      return { target: "DELIVERED", label: "Teslim et" };
    default:
      return null;
  }
}
