"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, authInputClass, authButtonClass } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { useSignedOutOnArrival } from "@/components/auth/useSignedOutOnArrival";
import { clerkMessage } from "@/lib/clerkError";
import { api } from "@/lib/api";
import { normalizeDzPhone } from "@withyou/shared-utils";

type AccountType = "consumer" | "partner";

const ACCOUNT_CHOICES: { value: AccountType; label: string; hint: string; Icon: typeof Store }[] = [
  { value: "consumer", label: "Je suis une cliente", hint: "Découvrir des soins adaptés à ma peau", Icon: Sparkles },
  { value: "partner", label: "Je suis une marque", hint: "Devenir partenaire de withyou", Icon: Store },
];

export default function RegisterPage() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken } = useAuth();
  const arrivalReady = useSignedOutOnArrival();

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [nomMarque, setNomMarque] = useState("");

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resent, setResent] = useState<string | null>(null);

  async function resendCode() {
    if (!isLoaded) return;
    setError(null);
    setResent(null);
    setIsSubmitting(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResent(`Nouveau code envoyé à ${email}.`);
    } catch (err) {
      setError(clerkMessage(err, "Impossible de renvoyer le code."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    const phone = normalizeDzPhone(telephone);
    if (!phone) {
      setError("Numéro de téléphone invalide : un mobile (05, 06, 07) ou un fixe algérien, ex. 0550 12 34 56.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: prenom,
        lastName: nom,
        // Lu par le backend (webhook Clerk / sync à la volée) pour créer soit le
        // consommateur, soit une demande partenaire en attente de validation.
        unsafeMetadata:
          accountType === "partner"
            ? { accountType, nomMarque: nomMarque.trim(), telephone: phone }
            : { accountType: "consumer", telephone: phone },
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error("Clerk sign-up refused:", err);
      setError(clerkMessage(err, "Impossible de créer le compte. Vérifiez vos informations."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // Crée tout de suite les lignes côté backend si le webhook n'est pas encore passé.
        try {
          const token = await getToken();
          await api.get("/users/me", { token });
        } catch (err) {
          console.error("Synchronisation du compte différée:", err);
        }
        if (accountType === "partner") {
          // Première étape d'une marque : déposer son dossier (registre, catalogue…).
          router.push("/ma-demande");
        } else {
          router.push("/");
        }
      } else {
        setError("Code de vérification invalide.");
      }
    } catch (err) {
      setError(clerkMessage(err, "Code de vérification invalide."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!arrivalReady) {
    return (
      <AuthShell title="Un instant…" subtitle="Fermeture de la session précédente.">
        <span />
      </AuthShell>
    );
  }

  if (!accountType) {
    return (
      <AuthShell title="Créer un compte" subtitle="Vous êtes…">
        <div className="flex flex-col gap-3">
          {ACCOUNT_CHOICES.map(({ value, label, hint, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccountType(value)}
              className="flex items-center gap-4 rounded-2xl border border-[#DCE8DF] bg-white px-4 py-4 text-left transition hover:border-[#4A6E4F] hover:shadow-[0_6px_20px_rgba(7,50,13,0.08)] focus:outline-none focus:ring-2 focus:ring-[#4A6E4F]/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF6EE] text-[#07320D]">
                <Icon size={20} />
              </span>
              <span>
                <span className="block font-semibold text-[#07320D]">{label}</span>
                <span className="block text-sm" style={{ color: "#4A6E4F" }}>
                  {hint}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: "#4A6E4F" }}>
          Déjà un compte ?{" "}
          <Link href="/login" className="font-semibold text-[#07320D] underline-offset-2 hover:underline">
            Connectez-vous
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (pendingVerification) {
    return (
      <AuthShell title="Vérifie ton email" subtitle={`Un code de vérification a été envoyé à ${email}.`}>
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code de vérification"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={authInputClass}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? "Vérification..." : "Valider"}
          </Button>
        </form>
        {resent ? <p className="mt-4 text-center text-sm" style={{ color: "#4A6E4F" }}>{resent}</p> : null}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void resendCode()}
          className="mt-4 block w-full text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline disabled:opacity-50"
        >
          Renvoyer le code
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: "#4A6E4F" }}>
          Rien reçu ? Regardez dans les courriers indésirables. Certaines messageries (iCloud notamment) filtrent ces e-mails :
          vous pouvez aussi vous inscrire avec Google ou une autre adresse.
        </p>
        <button
          type="button"
          onClick={() => {
            setPendingVerification(false);
            setCode("");
            setError(null);
            setResent(null);
          }}
          className="mt-3 block w-full text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline"
        >
          ← Modifier l&apos;adresse
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={accountType === "partner" ? "Compte marque" : "Créer un compte"}
      subtitle={accountType === "partner" ? "Votre demande sera validée par withyou" : "Rejoignez WithYou"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {accountType === "partner" ? (
          <input
            required
            maxLength={120}
            value={nomMarque}
            onChange={(e) => setNomMarque(e.target.value)}
            placeholder="Nom de la marque"
            autoComplete="organization"
            className={authInputClass}
          />
        ) : null}
        <SocialButtons
          mode="signUp"
          unsafeMetadata={accountType === "partner" ? { accountType, nomMarque: nomMarque.trim() } : { accountType: "consumer" }}
          disabled={accountType === "partner" && !nomMarque.trim()}
          disabledHint="Indiquez d'abord le nom de la marque."
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Prénom"
            autoComplete="given-name"
            className={authInputClass}
          />
          <input
            required
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom"
            autoComplete="family-name"
            className={authInputClass}
          />
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={authInputClass}
        />
        <input
          type="tel"
          required
          maxLength={20}
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Téléphone (ex. 0550 12 34 56)"
          autoComplete="tel"
          inputMode="tel"
          className={authInputClass}
        />
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        <p className="-mt-1 text-xs" style={{ color: "#4A6E4F" }}>10 caractères au minimum.</p>
        {/* Clerk Smart CAPTCHA mount point, required when bot protection is enabled */}
        <div id="clerk-captcha" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? "Création..." : "S'inscrire"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => {
          setAccountType(null);
          setError(null);
        }}
        className="mt-6 block w-full text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline"
      >
        ← Changer de type de compte
      </button>
    </AuthShell>
  );
}
