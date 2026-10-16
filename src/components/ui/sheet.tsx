"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Sheet({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.button
            type="button"
            aria-label="Close overlay"
            className="absolute inset-0 bg-hb-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative z-10 w-full max-w-md rounded-t-[28px] border border-white/60 bg-hb-card p-5 shadow-soft sm:rounded-[28px]",
              className
            )}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-hb-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="hb-focus grid h-9 w-9 place-items-center rounded-full bg-hb-mist text-hb-forest"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
