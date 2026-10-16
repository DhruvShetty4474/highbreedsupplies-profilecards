"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "bg-hb-cta text-white shadow-lift hover:brightness-105 active:scale-[0.98]",
  secondary:
    "bg-hb-mist text-hb-forest hover:bg-hb-sand active:scale-[0.98]",
  ghost: "bg-transparent text-hb-leaf hover:bg-hb-mist",
  danger: "bg-hb-danger text-white hover:brightness-105",
  outline:
    "border border-hb-sand bg-white text-hb-forest hover:border-hb-action/40",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition hb-focus disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-base",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
