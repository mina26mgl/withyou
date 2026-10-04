import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const pillButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none min-h-11",
  {
    variants: {
      variant: {
        primary: "bg-partner-cta text-white hover:bg-partner-ctaHover",
        ghost: "bg-partner-card text-partner-ink border border-partner-border hover:border-partner-muted",
        link: "bg-transparent text-partner-heading underline-offset-2 hover:underline px-0 min-h-0",
      },
      size: {
        default: "px-[18px] py-[10px] text-sm",
        sm: "px-3 py-1.5 text-[13px] min-h-9",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface PillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pillButtonVariants> {
  /** Shows a trailing chevron, matching the prototype's primary CTA style. */
  withChevron?: boolean;
}

export const PillButton = React.forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ className, variant, size, withChevron, children, ...props }, ref) => (
    <button ref={ref} className={cn(pillButtonVariants({ variant, size }), className)} {...props}>
      {children}
      {withChevron && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
    </button>
  ),
);
PillButton.displayName = "PillButton";

/** A link that looks like a PillButton — for navigation that is not an action. */
export function PillLink({
  href,
  variant,
  size,
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "ghost" | "link";
  size?: "default" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(pillButtonVariants({ variant, size }), className)}>
      {children}
    </Link>
  );
}
