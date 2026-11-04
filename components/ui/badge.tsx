import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent",
  {
    variants: {
      variant: {
        default: "bg-surface border border-line text-ink",
        primary: "bg-accent/15 border border-accent/40 text-accent-strong",
        secondary: "bg-raised border border-line text-muted",
        success: "bg-ready/15 border border-ready/40 text-ready",
        warning: "bg-amber-500/15 border border-amber-500/40 text-amber-800 dark:text-amber-400",
        danger: "bg-danger/15 border border-danger/40 text-danger",
        info: "bg-sky-500/15 border border-sky-500/40 text-sky-700 dark:text-sky-400",
        outline: "border border-line text-ink",
      },
      size: {
        sm: "text-[11px] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { badgeVariants };
