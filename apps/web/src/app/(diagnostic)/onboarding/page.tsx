"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { api } from "@/lib/api";
import { setProfilePhoto } from "@/lib/photoStore";
import { saveOnboardingStep, uploadProfilePhoto } from "@/lib/onboarding";
import { resizeImageToJpeg } from "@/lib/resizeImage";

const blurLayers = [12, 8, 4, 2] as const;

interface MeResponse {
  user: {
    id_usr: string;
    role: string;
    email: string;
    username: string | null;
    pdpurl: string | null;
  };
  consomateur: {
    id_consumer: string;
    nom: string | null;
    prenom: string | null;
    gender: string | null;
  } | null;
  partnerStatus: "NONE" | "PENDING" | "REJECTED" | "ACTIVE";
}

/** Compte déjà connu de withyou (marque partenaire ou console admin) : ses infos sont reprises. */
type Genre = "homme" | "femme";
const GENRES: { value: Genre; label: string }[] = [
  { value: "homme", label: "Homme" },
  { value: "femme", label: "Femme" },
];

const isProAccount = (me: MeResponse) => me.partnerStatus === "ACTIVE" || me.user.role === "ADMIN";

export default function OnboardingPage() {
  const router = useRouter();
  const { getToken, isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isSignUpLoaded, signUp, setActive } = useSignUp();
  const clerk = useClerk();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // Photo choisie sur cet écran, envoyée au serveur une fois la session ouverte.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Partenaire ou admin connecté(e) : email repris de son compte, non modifiable ici.
  const [isPro, setIsPro] = useState(false);
  // « Tu es… » (consomateur.gender), obligatoire pour continuer.
  const [genre, setGenre] = useState<Genre | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setPhotoFile(file);
    setProfilePhoto(url);
  }

  // Connectée, le compte existe déjà : seul le nom est demandé (email et mot de passe ne servent pas).
  const isComplete = isSignedIn
    ? nom.trim().length > 0 && genre !== null
    : nom.trim().length > 0 && genre !== null && email.trim().length > 0 && password.length >= 8;

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (!isAuthLoaded) return;

    (async () => {
      const token = await getToken();
      if (!token) return;

      try {
        let me = await api.get<MeResponse>("/users/me", { token });
        // Nouvelle cliente : champs vides. Partenaire ou admin : on reprend ses infos.
        if (!isProAccount(me)) return;
        if (!me.consomateur) {
          // Premier passage côté cliente : le profil est créé avec le prénom et le nom de l'espace pro.
          await api.post("/users/me/espace-cliente", undefined, { token });
          me = await api.get<MeResponse>("/users/me", { token });
        }
        const fullName = [me.consomateur?.prenom, me.consomateur?.nom].filter(Boolean).join(" ");
        if (fullName) setNom((current) => current || fullName);
        setEmail(me.user.email);
        const savedGenre = me.consomateur?.gender;
        if (savedGenre === "homme" || savedGenre === "femme") setGenre((current) => current ?? savedGenre);
        setIsPro(true);
        // Une photo choisie entre-temps sur cet écran reste prioritaire.
        const pdp = me.user.pdpurl;
        if (pdp) setPhotoUrl((current) => current ?? pdp);
      } catch {
        // Pas encore synchronisé (webhook Clerk pas encore passé) : on laisse les champs vides.
      }
    })();
  }, [isAuthLoaded, getToken]);

  function goToConfirmation() {
    setLeaving(true);
    setTimeout(() => router.push(`/confirmation?nom=${encodeURIComponent(nom)}`), 500);
  }

  /** Enregistre le nom et la photo de la cliente, puis passe au quiz. */
  async function saveProfileAndContinue() {
    try {
      // Juste après setActive, useAuth n'a pas encore la nouvelle session : on passe par Clerk.
      const token = (await clerk.session?.getToken()) ?? null;
      await saveOnboardingStep(token, { nomComplet: nom.trim(), ...(genre ? { genre } : {}) });
      if (photoFile) {
        await uploadProfilePhoto(token, await resizeImageToJpeg(photoFile));
        setPhotoFile(null);
      }
    } catch (err) {
      console.error("Profil de l'onboarding non enregistré:", err);
      setError("Impossible d'enregistrer votre profil. Réessayez.");
      return;
    }
    goToConfirmation();
  }

  async function handleContinuer() {
    if (!isComplete) return;

    if (isSignedIn) {
      setIsSubmitting(true);
      setError(null);
      await saveProfileAndContinue();
      setIsSubmitting(false);
      return;
    }

    if (!isSignUpLoaded) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const [firstName, ...rest] = nom.trim().split(/\s+/);
      const lastName = rest.join(" ") || firstName;

      await signUp.create({ emailAddress: email, password, firstName, lastName });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      if (isClerkAPIResponseError(err) && err.errors[0]) {
        setError(err.errors[0].longMessage ?? err.errors[0].message);
      } else {
        setError("Impossible de créer le compte. Vérifiez vos informations.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignUpLoaded) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Compte créé : en cas d'échec, « Continuer » réessaie depuis le formulaire.
        setPendingVerification(false);
        await saveProfileAndContinue();
      } else {
        setError("Code de vérification invalide.");
      }
    } catch (err) {
      if (isClerkAPIResponseError(err) && err.errors[0]) {
        setError(err.errors[0].longMessage ?? err.errors[0].message);
      } else {
        setError("Code de vérification invalide.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: "40px",
    borderRadius: "8px",
    border: "1px solid #E9EAEB",
    padding: "0 14px",
    fontSize: "14px",
    color: "#07320D",
    background: "#FFFFFF",
    outline: "none",
    boxSizing: "border-box",
  };

  if (pendingVerification) {
    return (
      <div className="flex flex-col min-h-screen max-w-[430px] mx-auto justify-center gap-6 px-6 py-8 bg-[#FCFFFD]">
        <h1
          style={{
            fontFamily: "var(--font-averia), serif",
            fontWeight: 700,
            fontSize: "24px",
            color: "#07320D",
          }}
        >
          Vérifie ton email
        </h1>
        <p style={{ fontSize: "14px", color: "#535862" }}>Un code de vérification a été envoyé à {email}.</p>
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code de vérification"
            style={inputStyle}
          />
          {error ? <p style={{ fontSize: "14px", color: "#DC2626" }}>{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              height: "40px",
              borderRadius: "16px",
              background: "#07320D",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Vérification..." : "Valider"}
          </button>
        </form>
      </div>
    );
  }

  return (
    // Fond pleine largeur (ciel et flous couvrent aussi les tablettes), contenu dans une colonne
    // de 430px centrée en hauteur ; la page défile si l'écran est trop petit ou le clavier ouvert.
    <div className="relative w-full overflow-x-hidden overflow-y-auto bg-[#FCFFFD]" style={{ height: "100dvh" }}>
      {/* Nuage */}
      <div
        className="absolute top-0 pointer-events-none"
        style={{ left: "50%", transform: "translateX(-50%)", width: "max(100%, 851px)", height: "250px" }}
      >
        <img
          src="/nuage_inscription.png"
          alt=""
          style={{ width: "100%", height: "250px", objectFit: "cover", display: "block" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.50)" }} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(252, 255, 253, 0) 40%, #FCFFFD 100%)" }}
        />
      </div>

      {/* Flou haut */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-10" style={{ height: "65px" }}>
        {blurLayers.map((blur, i) => (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              opacity: 0.5,
              maskImage: `linear-gradient(to bottom, black 0%, transparent ${100 - i * 22}%)`,
              WebkitMaskImage: `linear-gradient(to bottom, black 0%, transparent ${100 - i * 22}%)`,
            }}
          />
        ))}
      </div>

      {/* Flou bas */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-10" style={{ height: "120px" }}>
        {blurLayers.map((blur, i) => (
          <div
            key={blur}
            className="absolute inset-0"
            style={{
              backdropFilter: `blur(${blur}px)`,
              WebkitBackdropFilter: `blur(${blur}px)`,
              opacity: 0.5,
              maskImage: `linear-gradient(to top, black 0%, transparent ${100 - i * 22}%)`,
              WebkitMaskImage: `linear-gradient(to top, black 0%, transparent ${100 - i * 22}%)`,
            }}
          />
        ))}
      </div>

      <div
        className="relative w-full max-w-[430px] mx-auto flex flex-col"
        style={{ minHeight: "100dvh", justifyContent: "center", padding: "72px 16px 56px", boxSizing: "border-box" }}
      >
        {/* Titre */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-averia), serif",
              fontWeight: 700,
              fontSize: "32px",
              lineHeight: "100%",
              letterSpacing: "-0.04em",
              color: "#07320D",
              margin: 0,
            }}
          >
            On commence simple.
          </p>
          <p
            style={{
              fontFamily: "var(--font-averia), serif",
              fontWeight: 400,
              fontSize: "16px",
              lineHeight: "100%",
              letterSpacing: "-0.04em",
              color: "#4A6E4F",
              margin: 0,
            }}
          >
            Trois champs, et on passe aux vraies questions.
          </p>
        </div>

        {/* Photo de profil — cliquable */}
        <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative" }}>
            {/* Input caché */}
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />

            {/* Cercle cliquable */}
            <label htmlFor="photo-upload" style={{ cursor: "pointer", display: "block" }} title="Changer la photo">
              <div
                style={{
                  width: "96px",
                  height: "96px",
                  borderRadius: "9999px",
                  background: "#FFFFFF",
                  border: "1px solid #00000014",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "88px",
                    height: "88px",
                    borderRadius: "9999px",
                    border: "1px solid #00000014",
                    overflow: "hidden",
                    boxShadow:
                      "0px 3px 3px -1.5px rgba(16,24,40,0.08), 0px 8px 8px -4px rgba(16,24,40,0.06), 0px 20px 24px -4px rgba(16,24,40,0.10)",
                  }}
                >
                  <img
                    src={photoUrl ?? "/profil.png"}
                    alt="profil"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                      ...(photoUrl ? {} : { top: "13px", left: "1px", position: "relative" as const }),
                    }}
                  />
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Champs + bouton */}
        <div
          style={{
            marginTop: "56px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Champ nom */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              type="text"
              placeholder="Tapez votre nom ici"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: "12px", color: "#535862", margin: 0 }}>Pour que nous puissions vous appeler</p>
          </div>

          {/* Email et mot de passe : pour créer le compte. Connectée, seul l'email d'un compte pro est rappelé. */}
          {(!isSignedIn || isPro) && (
            <input
              type="email"
              placeholder="Tapez votre email ici"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={isPro}
              style={isPro ? { ...inputStyle, color: "#535862", background: "#FAFAFA" } : inputStyle}
            />
          )}

          {/* Tu es… */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{ fontSize: "14px", color: "#414651", margin: 0 }}>Tu es...</p>
            <div role="radiogroup" aria-label="Tu es" style={{ display: "flex", gap: "8px" }}>
              {GENRES.map((g) => {
                const selected = genre === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGenre(g.value)}
                    style={{
                      fontFamily: "var(--font-playfair)",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#07320D",
                      padding: "8px 20px",
                      borderRadius: "16px",
                      border: selected ? "1px solid #07320D" : "1px solid #00000014",
                      background: selected ? "#F6FAF7" : "#FFFFFF",
                      cursor: "pointer",
                      transition: "all 150ms ease",
                    }}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!isSignedIn && (
            <input
              type="password"
              placeholder="Tapez votre mot de passe ici"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          )}

          {/* Clerk Smart CAPTCHA, requis quand la protection anti-bot est active */}
          <div id="clerk-captcha" />

          {error ? <p style={{ fontSize: "12px", color: "#DC2626", margin: 0 }}>{error}</p> : null}

          {/* Bouton */}
          <button
            onClick={handleContinuer}
            disabled={isSubmitting}
            style={
              isComplete && !isSubmitting
                ? {
                    width: "118px",
                    height: "36px",
                    borderRadius: "16px",
                    padding: "8px 14px",
                    gap: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "linear-gradient(#07320D, #07320D) padding-box, linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%) border-box",
                    border: "2px solid transparent",
                    boxShadow:
                      "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.06) inset",
                    color: "#FFFFFF",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }
                : {
                    width: "124px",
                    height: "40px",
                    borderRadius: "16px",
                    padding: "10px 14px",
                    gap: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#F5F5F5",
                    border: "1px solid #E9EAEB",
                    boxShadow: "0px 1px 2px 0px rgba(16,24,40,0.05)",
                    color: "#A4A7AE",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "not-allowed",
                    transition: "all 200ms ease",
                  }
            }
          >
            {isSubmitting ? "Création..." : "Continuer"} <span style={{ marginLeft: "2px" }}>›</span>
          </button>
        </div>
      </div>

      {/* Overlay fondu-blanc — entrée depuis le blanc, sortie vers le blanc (tout l'écran) */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: "#FCFFFD",
          opacity: leaving ? 1 : visible ? 0 : 1,
          transition: "opacity 500ms ease",
        }}
      />
    </div>
  );
}
