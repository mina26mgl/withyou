"use client";

import { useDaytime } from "@/lib/useDaytime";

export function PageHeader({
  title,
  subtitle,
  actions,
  backgroundImage,
  dark,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Par défaut : ciel du matin en journée, ciel du soir de 18 h à 6 h. */
  backgroundImage?: string;
  /** Image sombre : texte en blanc (par défaut, le soir). */
  dark?: boolean;
}) {
  const { evening, skyImage } = useDaytime();
  const image = backgroundImage ?? skyImage;
  const isDark = dark ?? (backgroundImage ? false : evening);
  return (
    <header
      className="relative flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-[28px] px-[34px] py-9 max-[900px]:rounded-[22px] max-[900px]:px-5 max-[900px]:py-[26px]"
      style={{ backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#D3E9F2" }}
    >
      <div>
        <h1
          className={`font-partner-heading text-[clamp(28px,3.2vw,40px)] leading-[1.08] ${isDark ? "text-white" : "text-partner-heading"}`}
          style={isDark ? { textShadow: "0 1px 12px rgba(0,0,0,.25)" } : undefined}
        >
          {title}
        </h1>
        {subtitle && <p className={`mt-2.5 max-w-[60ch] ${isDark ? "text-white/90" : "text-partner-muted"}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
