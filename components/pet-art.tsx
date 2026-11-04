import { Bath, Cat, Dog, Heart, PawPrint, Scissors, Sparkles, Truck, X, type LucideIcon } from "lucide-react";
import type { PetSize, WorkStage } from "@prisma/client";
import { cn } from "@/lib/utils";

// What makes the screens look like a pet salon: drawn faces, and an icon for each size and stage.

/** A dog's face, for welcome and empty screens */
export function DogFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M13 13c-6 2-10 12-8 24 1 5 7 6 10 1l6-20c1-4-4-7-8-5Z" fill="#a9683b" />
      <path d="M51 13c6 2 10 12 8 24-1 5-7 6-10 1l-6-20c-1-4 4-7 8-5Z" fill="#a9683b" />
      <path d="M32 9c13 0 21 9 21 22 0 15-9 26-21 26S11 46 11 31C11 18 19 9 32 9Z" fill="#e9b87f" />
      <path d="M32 31c8 0 14 6 14 13 0 8-6 13-14 13s-14-5-14-13c0-7 6-13 14-13Z" fill="#fbf1e0" />
      <circle cx="23" cy="27" r="3.2" fill="#2a2018" />
      <circle cx="41" cy="27" r="3.2" fill="#2a2018" />
      <circle cx="24" cy="26" r="1" fill="#fff" />
      <circle cx="42" cy="26" r="1" fill="#fff" />
      <path d="M27 37c0-2 10-2 10 0 0 3-3 5-5 5s-5-2-5-5Z" fill="#2a2018" />
      <path d="M32 42v3" stroke="#2a2018" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M28 46c1 2 7 2 8 0v3c0 3-2 4-4 4s-4-1-4-4v-3Z" fill="#ec7a5c" />
    </svg>
  );
}

/** A cat's face, for welcome and empty screens */
export function CatFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M12 6 28 18 10 30Z" fill="#d98b45" />
      <path d="M52 6 36 18 54 30Z" fill="#d98b45" />
      <path d="m14 11 8 6-9 6Z" fill="#f4c3a8" />
      <path d="m50 11-8 6 9 6Z" fill="#f4c3a8" />
      <ellipse cx="32" cy="35" rx="23" ry="21" fill="#efa95f" />
      <path d="M32 16v8M25 17l1 6M39 17l-1 6" stroke="#c9772f" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="32" cy="44" rx="11" ry="9" fill="#fbf1e0" />
      <ellipse cx="22" cy="32" rx="3.2" ry="4" fill="#2a2018" />
      <ellipse cx="42" cy="32" rx="3.2" ry="4" fill="#2a2018" />
      <circle cx="23" cy="30.5" r="1" fill="#fff" />
      <circle cx="43" cy="30.5" r="1" fill="#fff" />
      <path d="M29 40h6l-3 3Z" fill="#ec7a5c" />
      <path d="M32 43v2c0 2-3 3-5 2M32 45c0 2 3 3 5 2" fill="none" stroke="#2a2018" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 37l10 2M6 45l10-2M58 37l-10 2M58 45l-10-2" stroke="#7a5a3a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** The dog and the cat side by side */
export function PetFaces({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end", className)} aria-hidden="true">
      <DogFace className="h-full w-auto" />
      <CatFace className="-ml-[12%] h-[82%] w-auto" />
    </span>
  );
}

const DOG_SCALE: Record<Exclude<PetSize, "CAT">, string> = {
  SMALL: "h-4 w-4",
  MEDIUM: "h-5 w-5",
  LARGE: "h-6 w-6",
  GIANT: "h-7 w-7",
};

/** A cat, or a dog that grows with its price class */
export function SizeIcon({ size, className }: { size: PetSize; className?: string }) {
  if (size === "CAT") return <Cat className={cn("h-5 w-5", className)} aria-hidden="true" />;
  return <Dog className={cn(DOG_SCALE[size], className)} aria-hidden="true" />;
}

export const STAGE_ICONS: Record<WorkStage, LucideIcon> = {
  RECEIVED: PawPrint,
  BATHING: Bath,
  GROOMING: Scissors,
  QUALITY_CHECK: Sparkles,
  READY: Heart,
  TAXI_DELIVERY: Truck,
  DELIVERED: Heart,
  CANCELLED: X,
};
