import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { cn } from "@/lib/utils";

/** Photo de profil d'un membre de l'équipe, ou l'image de profil par défaut. */
export function AdminAvatar({
  prenom,
  nom,
  photoUrl,
  size = 38,
  className,
}: {
  prenom: string;
  nom: string;
  photoUrl: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid flex-none place-items-center overflow-hidden rounded-full border border-partner-border bg-white", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl || DEFAULT_AVATAR}
        alt={photoUrl ? `Photo de ${`${prenom} ${nom}`.trim()}` : ""}
        className={photoUrl ? "h-full w-full object-cover" : "h-full w-full object-contain p-[12%]"}
      />
    </div>
  );
}
