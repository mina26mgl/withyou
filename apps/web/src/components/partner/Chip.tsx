import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
}

/** Toggle chip using aria-pressed, per the prototype's multi-select chip pattern. */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, pressed, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      className={cn(
        "min-h-11 rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] text-partner-ink transition-colors",
        "hover:border-partner-muted",
        "aria-pressed:bg-partner-leafBg aria-pressed:border-partner-leaf aria-pressed:text-partner-heading aria-pressed:font-semibold",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Chip.displayName = "Chip";
