import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "danger" | "info" | "mute";

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: "bg-partner-leafBg text-partner-leaf",
  warn: "bg-partner-warnBg text-partner-warn",
  danger: "bg-partner-dangerBg text-partner-danger",
  info: "bg-partner-infoBg text-partner-info",
  mute: "bg-partner-bg text-partner-muted border border-partner-border",
};

/**
 * Status pills never rely on color alone — the label text always states the
 * status in words, so the color is a reinforcement, not the only signal.
 */
export function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold whitespace-nowrap",
        TONE_CLASSES[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
