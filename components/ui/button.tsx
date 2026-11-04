import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-ink hover:bg-accent-hover font-semibold shadow-sm shadow-accent/20",
        secondary: "bg-raised text-ink hover:bg-line border border-line",
        ghost: "text-ink hover:bg-raised hover:text-ink",
        outline: "border border-line bg-transparent text-ink hover:bg-raised",
        light: "bg-ink text-ground hover:bg-white font-semibold",
        danger: "text-danger hover:bg-danger/10 border border-transparent hover:border-danger/30",
        success: "bg-ready/15 text-ready border border-ready/40 hover:bg-ready/25 font-semibold",
      },
      size: {
        md: "h-12 px-5 text-[15px]",
        lg: "h-14 px-6 text-base",
        sm: "h-10 px-3.5 text-sm",
        xs: "h-10 lg:h-8 px-2.5 text-xs rounded-lg",
        icon: "h-12 w-12",
        "icon-sm": "h-11 w-11 lg:h-9 lg:w-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonStyles({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
