"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, label, hint, id, ...props },
  ref
) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-hb-forest">{label}</span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-12 w-full rounded-2xl border border-hb-sand bg-white/90 px-4 text-sm text-hb-ink placeholder:text-hb-leaf/50 hb-focus",
          className
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-hb-leaf/70">{hint}</span> : null}
    </label>
  );
});
