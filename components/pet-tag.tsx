import { Cat, Dog, PawPrint } from "lucide-react";
import type { PetSize } from "@prisma/client";
import { SIZES } from "@/lib/stages";
import { cn } from "@/lib/utils";

const SCALE = {
  xs: { box: "h-7 gap-1 px-2 text-[13px]", icon: "h-3.5 w-3.5" },
  sm: { box: "h-8 gap-1.5 px-2.5 text-[15px]", icon: "h-4 w-4" },
  md: { box: "h-11 gap-2 px-3.5 text-xl", icon: "h-5 w-5" },
  lg: { box: "h-16 gap-3 px-5 text-4xl", icon: "h-8 w-8" },
} as const;

/** The pet's name on a collar tag. Salons know their customers by the pet, so it anchors every card */
export function PetTag({ pet, size = "md", className }: { pet: { name: string; size?: PetSize }; size?: keyof typeof SCALE; className?: string }) {
  const s = SCALE[size];
  const Icon = pet.size === "CAT" ? Cat : pet.size ? Dog : PawPrint;
  return (
    <span
      title={pet.size ? SIZES[pet.size].label : undefined}
      className={cn("inline-flex max-w-full shrink-0 items-center rounded-full border border-accent/30 bg-accent/10 align-middle font-display font-bold text-ink", s.box, className)}
    >
      <Icon className={cn("shrink-0 text-accent-strong", s.icon)} aria-hidden="true" />
      <span className="truncate">{pet.name}</span>
    </span>
  );
}
