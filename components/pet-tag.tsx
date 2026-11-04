import type { PetSize } from "@prisma/client";
import { SIZES } from "@/lib/stages";
import { cn } from "@/lib/utils";

const SCALE = {
  xs: { box: "h-7 gap-1 px-2 text-[13px]", icon: 13 },
  sm: { box: "h-8 gap-1.5 px-2.5 text-[15px]", icon: 15 },
  md: { box: "h-11 gap-2 px-3 text-xl", icon: 20 },
  lg: { box: "h-16 gap-3 px-5 text-4xl", icon: 32 },
} as const;

/** The pet's name on a tag with a paw. Salons know their customers by the pet, so it anchors every card */
export function PetTag({ pet, size = "md", className }: { pet: { name: string; size?: PetSize }; size?: keyof typeof SCALE; className?: string }) {
  const s = SCALE[size];
  return (
    <span
      title={pet.size ? SIZES[pet.size].label : undefined}
      className={cn("inline-flex max-w-full shrink-0 items-center rounded-full border border-line bg-raised align-middle font-display font-bold text-ink", s.box, className)}
    >
      <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-accent-strong" aria-hidden="true">
        <ellipse cx="6" cy="11" rx="2.1" ry="2.7" />
        <ellipse cx="10" cy="6.8" rx="2.1" ry="2.8" />
        <ellipse cx="14.2" cy="6.8" rx="2.1" ry="2.8" />
        <ellipse cx="18.2" cy="11" rx="2.1" ry="2.7" />
        <path d="M12.1 11.4c-2.9 0-5.4 2.8-5.4 5.5 0 1.7 1.3 2.7 2.8 2.7 1 0 1.6-.5 2.6-.5s1.6.5 2.6.5c1.5 0 2.8-1 2.8-2.7 0-2.7-2.5-5.5-5.4-5.5z" />
      </svg>
      <span className="truncate">{pet.name}</span>
    </span>
  );
}
