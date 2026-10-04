"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CircleUser, Droplets, Heart, LifeBuoy, MapPin, ShoppingBag, Smile, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { uploadProfilePhoto, useOnboardingStep } from "@/lib/onboarding";
import { PROFILE_TITLES, profileTitle, type ProfileTitle } from "@/lib/parcours";
import { setProfilePhoto, useProfilePhoto } from "@/lib/photoStore";
import { resizeImageToJpeg } from "@/lib/resizeImage";
import SiteFooter from "@/components/layout/SiteFooter";
import { SCAN_IA_ENABLED } from "@/lib/features";

const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" };

const CARD_SHADOW = [
  "1px 1px 3px 0px #0000000A",
  "4px 4px 6px 0px #00000008",
  "9px 9px 8px 0px #00000005",
  "16px 17px 9px 0px #00000003",
  "24px 26px 10px 0px #00000000",
].join(", ");

/** Zone floutée sous le texte, et hauteur sur laquelle le flou s'estompe au-dessus. */
const BLUR_HEIGHT = 147;
/** Hauteur du flou lui-même (plus courte que la zone de texte), puis son fondu vers le haut. */
const BLUR_LAYER = 110;
const BLUR_FADE = 24;
const AVATAR = 97.37;
/** Le bas de la photo de profil mord à peine sur la zone floutée, au-dessus du nom. */
const AVATAR_BOTTOM = BLUR_HEIGHT - 14;

/** Texte blanc posé sur la photo : une ombre douce le garde lisible sur les zones claires. */
const ON_IMAGE_SHADOW = "0px 1px 8px rgba(0,0,0,0.25)";

const MENU: { label: string; icon: LucideIcon; href?: string }[] = [
  ...(SCAN_IA_ENABLED ? [{ label: "Mon profil peau", icon: Smile, href: "/profil/skin-scan" }] : []),
  { label: "Mes routines", icon: Droplets, href: "/routine" },
  { label: "Mes commandes", icon: ShoppingBag, href: "/commandes" },
  { label: "Mes favoris", icon: Heart },
  { label: "Mon adresse de livraison", icon: MapPin },
  { label: "Mon compte", icon: CircleUser },
  { label: "Aide & Support", icon: LifeBuoy },
];

function useProfileTitle(): ProfileTitle | null {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [title, setTitle] = useState<ProfileTitle | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setTitle(profileTitle({ commandes: 0, routineActive: false }));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const parcours = await api.get<{ commandes: number; routineActive: boolean }>("/users/me/parcours", {
          token: await getToken(),
        });
        if (!cancelled) setTitle(profileTitle(parcours));
      } catch (err) {
        console.error("Parcours indisponible:", err);
        if (!cancelled) setTitle(profileTitle({ commandes: 0, routineActive: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return title;
}

/** Choisir une nouvelle photo : affichée tout de suite, puis enregistrée (user.pdpurl). */
function usePhotoChange(current: string | null) {
  const { isSignedIn, getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isSignedIn) return;
    setError(null);
    const preview = URL.createObjectURL(file);
    setProfilePhoto(preview);
    setUploading(true);
    try {
      const { url } = await uploadProfilePhoto(await getToken(), await resizeImageToJpeg(file));
      setProfilePhoto(url);
    } catch (err) {
      console.error("Photo de profil non enregistrée:", err);
      setProfilePhoto(current ?? DEFAULT_AVATAR);
      setError(err instanceof Error && err.message.includes("format") ? err.message : "La photo n'a pas pu être enregistrée. Réessaie.");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(preview);
    }
  };

  return { inputRef, onFile, uploading, error, canChange: !!isSignedIn, open: () => inputRef.current?.click() };
}

function ProfileCard() {
  const { saved: profile } = useOnboardingStep();
  const photo = useProfilePhoto();
  const change = usePhotoChange(photo);
  const title = useProfileTitle();
  const info = title ? PROFILE_TITLES[title] : null;
  const name = [profile?.prenom, profile?.nom].filter(Boolean).join(" ") || "Bienvenue";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 334,
        margin: "0 auto",
        borderRadius: 40,
        border: "1.78px solid #0000001A",
        overflow: "hidden",
        boxShadow: CARD_SHADOW,
        background: "#E8F0E9",
        boxSizing: "border-box",
      }}
    >
      {info && <Image src={info.image} alt="" fill priority sizes="430px" style={{ objectFit: "cover" }} />}

      {change.error && (
        <p
          role="alert"
          style={{ ...INTER, position: "absolute", top: 16, left: 16, right: 16, zIndex: 2, margin: 0, padding: "8px 12px", borderRadius: 12, background: "#FEF3F2", border: "1px solid #FECDCA", fontSize: 13, color: "#D92D20", textAlign: "center" }}
        >
          {change.error}
        </p>
      )}

      {/* Flou de la moitié basse : monte plus haut que le texte et s'estompe vers le haut, sans bord net */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BLUR_LAYER + BLUR_FADE,
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0) 3.49%, rgba(255, 255, 255, 0.05) 100%)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          maskImage: `linear-gradient(to bottom, transparent 0px, black ${BLUR_FADE}px)`,
          WebkitMaskImage: `linear-gradient(to bottom, transparent 0px, black ${BLUR_FADE}px)`,
        }}
      />

      {/* Liseré blanc intérieur, par-dessus la photo et le flou */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          // Décollé du bord, comme le liseré des photos produit de /routine.
          inset: 4,
          borderRadius: 36,
          // 1.5px haut / côtés, 0.7px bas. En ombres intérieures plutôt qu'en border :
          // à 100 % de zoom le navigateur arrondit une border de 1.5px à 1px (et 0.7px à 1px),
          // les quatre côtés auraient alors la même épaisseur.
          boxShadow: [
            "inset 0 1.5px 0 0 #FFFFFFCC",
            "inset 1.5px 0 0 0 #FFFFFFCC",
            "inset -1.5px 0 0 0 #FFFFFFCC",
            "inset 0 -0.7px 0 0 #FFFFFFCC",
          ].join(", "),
          pointerEvents: "none",
        }}
      />

      {/* Nom, titre et phrase */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BLUR_HEIGHT,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          textAlign: "center",
          padding: "0 20px 24px",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-averia), serif",
            fontWeight: 700,
            fontSize: 30,
            lineHeight: "100%",
            letterSpacing: "-0.06em",
            color: "#FFFFFF",
            margin: 0,
            textShadow: ON_IMAGE_SHADOW,
          }}
        >
          {name}
        </p>
        {info && (
          <>
            <p style={{ fontFamily: "var(--font-playfair)", fontSize: 16, color: "#FFFFFF", margin: "8px 0 4px", textShadow: ON_IMAGE_SHADOW }}>
              {info.label}
            </p>
            <p style={{ fontFamily: "var(--font-playfair)", fontSize: 13, lineHeight: "17px", color: "#FFFFFF", margin: 0, maxWidth: 260, textShadow: ON_IMAGE_SHADOW }}>
              {info.phrase}
            </p>
          </>
        )}
      </div>

      {/* Photo de profil au-dessus du nom, jasmin posé sur la bordure */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: AVATAR_BOTTOM,
          width: AVATAR,
          height: AVATAR,
          marginLeft: -AVATAR / 2,
        }}
      >
        <button
          type="button"
          onClick={change.open}
          disabled={!change.canChange || change.uploading}
          aria-label="Changer ma photo de profil"
          style={{
            display: "block",
            cursor: change.canChange ? "pointer" : "default",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: "1.01px solid #00000014",
            padding: 4.06,
            background: "#FFFFFF",
            boxSizing: "border-box",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo ?? DEFAULT_AVATAR}
            alt="Photo de profil"
            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block", opacity: change.uploading ? 0.6 : 1 }}
          />
        </button>
        <input ref={change.inputRef} type="file" accept="image/*" onChange={change.onFile} style={{ display: "none" }} />
        <Image
          src="/fleure-profile.png"
          alt=""
          width={34}
          height={34}
          style={{ position: "absolute", top: -11, right: 2, objectFit: "contain", filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.15))" }}
        />
      </div>
    </div>
  );
}

function MenuRow({ label, icon: Icon, href, last }: { label: string; icon: LucideIcon; href?: string; last: boolean }) {
  const content = (
    <>
      <Icon size={20} color="#07320D" strokeWidth={1.8} />
      <span style={{ fontFamily: "var(--font-playfair)", fontSize: 15, fontWeight: 600, color: "#07320D", flex: 1 }}>{label}</span>
      {!href && <span style={{ ...INTER, fontSize: 11, color: "#98A2B3" }}>Bientôt</span>}
    </>
  );
  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 4px",
    borderBottom: last ? "none" : "1px solid rgba(0,0,0,0.06)",
    textDecoration: "none",
  };
  return href ? (
    <Link href={href} style={style}>
      {content}
    </Link>
  ) : (
    <div style={{ ...style, opacity: 0.7 }}>{content}</div>
  );
}

export default function ProfilPage() {
  return (
    <div className="relative w-full max-w-[430px] mx-auto bg-[#FCFFFD] overflow-hidden" style={{ minHeight: "100dvh" }}>
      {/* Ciel en haut, fondu vers le fond de page */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 260,
          backgroundImage: "url('/nuage_inscription.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          opacity: 0.55,
          maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
        }}
      />

      <h1
        style={{
          position: "relative",
          fontFamily: "var(--font-averia), serif",
          fontWeight: 700,
          fontSize: 28,
          lineHeight: "100%",
          letterSpacing: "-0.09em",
          textAlign: "center",
          color: "#031A06",
          margin: 0,
          padding: "56px 0 24px",
        }}
      >
        Mon profil
      </h1>

      <div style={{ position: "relative", padding: "0 16px" }}>
        <ProfileCard />

        {/* Menu */}
        <p style={{ ...INTER, fontSize: 14, color: "#414651", margin: "28px 0 8px" }}>Personal</p>
        <nav style={{ borderRadius: 24, border: "1px solid rgba(0,0,0,0.08)", padding: "4px 16px", background: "#FFFFFF" }}>
          {MENU.map((item, i) => (
            <MenuRow key={item.label} {...item} last={i === MENU.length - 1} />
          ))}
        </nav>

      </div>

      <SiteFooter />
    </div>
  );
}
