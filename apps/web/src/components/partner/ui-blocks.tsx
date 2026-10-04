import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/** White rounded surface used by every block on the partner screens. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-[22px] border border-partner-border bg-partner-card p-[22px]", className)}>{children}</section>;
}

export function PanelHeader({
  title,
  sub,
  aside,
}: {
  title: string;
  sub?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3.5">
      <div>
        <h2 className="font-partner-heading text-[22px] leading-tight text-partner-heading">{title}</h2>
        {sub && <p className="mb-4 mt-1 max-w-[70ch] text-[13.5px] text-partner-muted">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function KpiGrid({
  items,
  columns = 4,
}: {
  items: { label: string; value: string; note?: string; tone?: "up" | "down" | "muted" }[];
  columns?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-3.5 max-[560px]:grid-cols-2",
        columns === 4 ? "grid-cols-4 max-[1180px]:grid-cols-2" : "grid-cols-3 max-[480px]:grid-cols-1",
      )}
    >
      {items.map((k) => (
        <div key={k.label} className="rounded-[18px] border border-partner-border bg-partner-card px-[18px] py-4">
          <div className="text-[13px] text-partner-muted">{k.label}</div>
          <div className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight max-[560px]:text-xl">{k.value}</div>
          {k.note && (
            <div
              className={cn(
                "text-[12.5px] font-semibold",
                k.tone === "down" ? "text-partner-danger" : k.tone === "muted" ? "text-partner-muted" : "text-partner-leaf",
              )}
            >
              {k.note}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Tabs<T extends string | number>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={label}>
      {items.map((t) => (
        <button
          key={String(t.key)}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className="min-h-11 rounded-full border border-partner-border bg-partner-card px-3.5 py-1.5 text-[13.5px] font-medium text-partner-muted hover:text-partner-ink aria-selected:border-[#B9D8E4] aria-selected:bg-partner-soft aria-selected:font-semibold aria-selected:text-partner-heading"
        >
          {t.label}
          {t.count !== undefined && <small className="ml-1 opacity-75">{t.count}</small>}
        </button>
      ))}
    </div>
  );
}

export function ProgressRing({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 38 38" width="38" height="38" aria-hidden="true">
      <circle cx="19" cy="19" r={r} fill="none" stroke="#E6ECEA" strokeWidth="4" />
      <circle
        cx="19"
        cy="19"
        r={r}
        fill="none"
        stroke="#3A9A5E"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform="rotate(-90 19 19)"
      />
    </svg>
  );
}

export function BarRow({ label, pct, color }: { label: string; pct: number; color?: string }) {
  return (
    <div className="mb-[11px] grid grid-cols-[120px_1fr_48px] items-center gap-2.5 text-[13.5px] max-[560px]:grid-cols-[90px_1fr_42px]">
      <span>{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full border border-partner-border bg-partner-bg">
        <b className="block h-full rounded-full bg-partner-leaf" style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="text-right tabular-nums">{pct} %</span>
    </div>
  );
}

export function Insight({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 rounded-[18px] p-[18px]" style={{ background: "linear-gradient(180deg, #D3E9F2, #F1F8FA)" }}>
      <Lightbulb className="mt-0.5 h-[22px] w-[22px] flex-none text-partner-heading" aria-hidden="true" />
      <div>
        <p className="mb-2.5 text-sm">{children}</p>
        {action}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-9 text-center text-partner-muted">{children}</p>;
}

export function LoadError({ what, message }: { what: string; message?: string | null }) {
  return (
    <div role="alert" className="mx-auto max-w-[60ch] rounded-2xl border border-partner-border bg-partner-dangerBg px-5 py-6 text-center">
      <b className="block text-partner-danger">Impossible de charger {what}.</b>
      {message && <p className="mb-0 mt-2 text-sm text-partner-ink">{message}</p>}
    </div>
  );
}

export const inputClass = "partner-input";
