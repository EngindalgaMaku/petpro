import type { ConditionKind } from "@prisma/client";

// The body parts of the top-view diagram (head at the top, the pet's left on the left), in a
// 240 × 480 drawing. Condition marks are recorded per part key.

export interface BodyPart {
  key: string;
  label: string;
  /** Outline in the drawing; `flip` mirrors it to the pet's right side */
  d: string;
  flip?: boolean;
  /** Where its numbered marks are drawn */
  cx: number;
  cy: number;
}

const EAR = "M86 42C68 36 50 50 47 74C45 94 56 106 69 100C81 94 85 76 88 60Z";
const FRONT_LEG = "M71 150C56 153 44 171 40 196C39 205 46 211 55 209L71 203C69 184 69 167 71 150Z";
const FRONT_PAW = "M30 228C30 219 38 213 47 213C56 213 64 219 64 228C64 237 56 243 47 243C38 243 30 237 30 228Z";
const REAR_LEG = "M73 300C57 304 45 324 41 350C40 360 47 366 56 364L75 355C73 338 73 320 73 300Z";
const REAR_PAW = "M31 382C31 373 39 367 48 367C57 367 65 373 65 382C65 391 57 397 48 397C39 397 31 391 31 382Z";

// Drawn back to front: ears and legs tuck under the head and the body
export const PARTS: BodyPart[] = [
  { key: "left_ear", label: "Sol kulak", d: EAR, cx: 66, cy: 72 },
  { key: "right_ear", label: "Sağ kulak", d: EAR, flip: true, cx: 174, cy: 72 },
  { key: "tail", label: "Kuyruk", d: "M111 392H129C137 420 141 446 131 469C126 479 115 477 113 468C120 445 118 420 111 392Z", cx: 124, cy: 432 },
  { key: "front_left_leg", label: "Sol ön bacak", d: FRONT_LEG, cx: 56, cy: 182 },
  { key: "front_right_leg", label: "Sağ ön bacak", d: FRONT_LEG, flip: true, cx: 184, cy: 182 },
  { key: "rear_left_leg", label: "Sol arka bacak", d: REAR_LEG, cx: 58, cy: 334 },
  { key: "rear_right_leg", label: "Sağ arka bacak", d: REAR_LEG, flip: true, cx: 182, cy: 334 },
  { key: "front_left_paw", label: "Sol ön pati", d: FRONT_PAW, cx: 47, cy: 228 },
  { key: "front_right_paw", label: "Sağ ön pati", d: FRONT_PAW, flip: true, cx: 193, cy: 228 },
  { key: "rear_left_paw", label: "Sol arka pati", d: REAR_PAW, cx: 48, cy: 382 },
  { key: "rear_right_paw", label: "Sağ arka pati", d: REAR_PAW, flip: true, cx: 192, cy: 382 },
  { key: "neck", label: "Boyun", d: "M97 100H143L153 134C132 143 108 143 87 134Z", cx: 120, cy: 120 },
  { key: "head", label: "Baş", d: "M120 6C137 6 146 21 153 39C161 59 159 85 141 99C131 106 109 106 99 99C81 85 79 59 87 39C94 21 103 6 120 6Z", cx: 120, cy: 56 },
  { key: "chest", label: "Göğüs", d: "M87 136C108 145 132 145 153 136C167 151 171 177 169 202H71C69 177 73 151 87 136Z", cx: 120, cy: 172 },
  { key: "back", label: "Sırt", d: "M71 204H169C170 236 170 264 168 294H72C70 264 70 236 71 204Z", cx: 120, cy: 249 },
  { key: "belly", label: "Karın", d: "M72 296H168C168 312 167 326 166 342H74C73 326 72 312 72 296Z", cx: 120, cy: 319 },
  { key: "rump", label: "Sağrı", d: "M74 344H166C166 370 148 392 120 394C92 392 74 370 74 344Z", cx: 120, cy: 366 },
];

export const PART_LABELS: Record<string, string> = Object.fromEntries(PARTS.map((p) => [p.key, p.label]));

export const isPart = (key: string) => key in PART_LABELS;

/** Centre of a part in the drawing, 0–1, where its numbered marks are drawn */
export function partCenter(key: string): { x: number; y: number } {
  const p = PARTS.find((x) => x.key === key);
  return p ? { x: p.cx / 240, y: p.cy / 480 } : { x: 0.5, y: 0.5 };
}

export const CONDITION_KINDS: Record<ConditionKind, string> = {
  MATTED: "Keçe",
  SKIN: "Deride kızarıklık",
  WOUND: "Yara, kabuk",
  PARASITE: "Pire, kene",
  EAR: "Kulakta kir, koku",
  NAIL: "Uzamış tırnak",
  LUMP: "Şişlik",
  OTHER: "Diğer",
};
