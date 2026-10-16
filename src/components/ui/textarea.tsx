"use client";

import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, label, id, ...props },
  ref
) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5">
      {label ? (
        <span className="text-sm font-medium text-hb-forest">{label}</span>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-[110px] w-full resize-y rounded-2xl border border-hb-sand bg-white/90 px-4 py-3 text-sm text-hb-ink placeholder:text-hb-leaf/50 hb-focus",
          className
        )}
        {...props}
      />
    </label>
  );
});
