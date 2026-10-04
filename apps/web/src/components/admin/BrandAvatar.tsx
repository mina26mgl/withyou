import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

/**
 * Logo de la marque (sur fond blanc : les logos sont souvent transparents),
 * ou l'image de profil par défaut tant qu'elle n'en a pas mis dans son espace.
 */
export function BrandAvatar({ name, logoUrl, size = 42 }: { name: string; logoUrl: string | null; size?: number }) {
  return (
    <div
      className="grid flex-none place-items-center overflow-hidden rounded-full border border-partner-border bg-white"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || DEFAULT_AVATAR}
        alt={logoUrl ? `Logo ${name}` : ""}
        className={logoUrl ? "h-full w-full object-contain p-1" : "h-full w-full object-contain p-[12%]"}
      />
    </div>
  );
}
