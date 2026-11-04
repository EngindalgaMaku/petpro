"use client";

import { PARTS, PART_LABELS, partCenter } from "@/lib/pet-parts";

interface Mark {
  number: number;
  part: string;
}

/**
 * The pet from above. Tappable when `onSelect` is given (intake); read-only on the customer's
 * page. `marks` are the numbered condition points, in the order they were recorded.
 */
export function PetDiagram({
  marks = [],
  selected,
  onSelect,
  className,
  theme = "dark",
}: {
  marks?: Mark[];
  selected?: string | null;
  onSelect?: (part: string) => void;
  className?: string;
  theme?: "dark" | "print";
}) {
  const isPrint = theme === "print";
  const interactive = !!onSelect;
  const props = (key: string) =>
    interactive
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": PART_LABELS[key],
          "aria-pressed": selected === key,
          onClick: () => onSelect!(key),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect!(key);
            }
          },
          style: { cursor: "pointer" },
        }
      : {};
  const fill = (key: string) => (selected === key ? "var(--color-accent)" : isPrint ? "#ffffff" : "var(--diagram-panel)");
  const stroke = (key: string) => (selected === key ? "var(--color-accent-hover)" : isPrint ? "#334155" : "var(--diagram-stroke)");

  // Several marks on one part fan out around its centre
  const perPart = new Map<string, number>();
  const placed = marks.map((m) => {
    const i = perPart.get(m.part) ?? 0;
    perPart.set(m.part, i + 1);
    const c = partCenter(m.part);
    return { ...m, cx: c.x * 240, cy: c.y * 480 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 22 };
  });

  return (
    <svg
      viewBox="0 0 240 480"
      className={className}
      role={interactive ? "group" : "img"}
      aria-label={interactive ? "Vücut şeması: bölgeye dokunun" : `Vücut şeması, ${marks.length} işaret`}
    >
      {PARTS.map((p) => (
        <g key={p.key} {...props(p.key)}>
          <path d={p.d} transform={p.flip ? "translate(240 0) scale(-1 1)" : undefined} fill={fill(p.key)} stroke={stroke(p.key)} strokeWidth={isPrint ? 2 : 2.5} strokeLinejoin="round" />
        </g>
      ))}
      {placed.map((m) => (
        <g key={m.number} aria-hidden="true" pointerEvents="none">
          <circle cx={m.cx} cy={m.cy} r={10} fill={isPrint ? "#dc2626" : "var(--diagram-mark)"} stroke={isPrint ? "#ffffff" : "var(--diagram-mark-ring)"} strokeWidth={1.5} />
          <text x={m.cx} y={m.cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff" fontFamily="var(--font-nunito), sans-serif">
            {m.number}
          </text>
        </g>
      ))}
    </svg>
  );
}
