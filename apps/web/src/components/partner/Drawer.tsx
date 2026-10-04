"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** 800px side drawer, full-screen under 700px. Escape closes it and focus returns to the opener. */
export function Drawer({ open, onClose, title, subtitle, footer, children }: DrawerProps) {
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      lastFocusRef.current = document.activeElement as HTMLElement;
      const firstField = panelRef.current?.querySelector<HTMLElement>(
        "input, select, textarea, button",
      );
      firstField?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      lastFocusRef.current?.focus?.();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#0a160f]/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={cn(
          "fixed top-0 right-0 bottom-0 z-[41] flex w-full max-w-[800px] flex-col border-l border-partner-border bg-partner-card transition-transform duration-300",
          "max-[700px]:max-w-full",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-partner-border px-6 py-5">
          <div>
            <h2 id="drawer-title" className="font-partner-heading text-[22px] text-partner-heading">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-[13.5px] text-partner-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-11 w-11 flex-none place-items-center rounded-full bg-partner-bg"
          >
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-partner-border px-6 py-3.5">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
