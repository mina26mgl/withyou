"use client";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Button } from "@/components/ui/button";
import { AuthShell, authInputClass, authButtonClass } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useSignedOutOnArrival } from "@/components/auth/useSignedOutOnArrival";
import { clerkErrorCode, clerkMessage } from "@/lib/clerkError";
import { homePath } from "@/lib/homePath";

type Step = "email" | "reset" | "trust";

/**
 * Mot de passe oublié, géré par Clerk : un code est envoyé à l'adresse du compte,
 * puis la personne choisit un nouveau mot de passe et est connectée directement.
 */
function ForgotPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoaded, signIn } = useSignIn();
  const arrivalReady = useSignedOutOnArrival();
  const clerk = useClerk();
  const attemptRef = useRef<Awaited<ReturnType<NonNullable<typeof signIn>["create"]>> | null>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [trustEmail, setTrustEmail] = useState("");
  const [trustCode, setTrustCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function finish(sessionId: string | null) {
    await clerk.setActive({ session: sessionId });
    router.push(await homePath(await clerk.session?.getToken()));
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (!isLoaded) return;
    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      // Une session déjà ouverte a été fermée à l'arrivée (useSignedOutOnArrival).
      attemptRef.current = await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() });
      setStep("reset");
      setInfo(`Un code a été envoyé à ${email.trim()}.`);
    } catch (err) {
      setError(
        clerkErrorCode(err) === "form_identifier_not_found"
          ? "Aucun compte withyou n'utilise cette adresse. Vérifiez-la, ou créez un compte."
          : clerkMessage(err, "Impossible d'envoyer le code. Vérifiez l'adresse."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    if (password.length < 10) return setError("Le nouveau mot de passe doit faire au moins 10 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne sont pas identiques.");
    setIsSubmitting(true);
    try {
      const attempt = attemptRef.current ?? signIn;
      const result = await attempt.attemptFirstFactor({ strategy: "reset_password_email_code", code: code.trim(), password });
      attemptRef.current = result;
      if (result.status === "complete") {
        await finish(result.createdSessionId);
      } else if (result.status === "needs_client_trust" || result.status === "needs_second_factor") {
        // Le mot de passe est changé ; Clerk demande encore de confirmer l'appareil.
        const emailFactor = result.supportedSecondFactors?.find((f) => f.strategy === "email_code");
        if (!emailFactor || emailFactor.strategy !== "email_code") {
          setError("Mot de passe changé. Connectez-vous avec le nouveau mot de passe.");
          return;
        }
        await result.prepareSecondFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
        setTrustEmail(emailFactor.safeIdentifier);
        setStep("trust");
      } else {
        setError(`Réinitialisation incomplète (étape suivante demandée par Clerk : ${result.status}).`);
      }
    } catch (err) {
      setError(clerkMessage(err, "Code incorrect ou expiré."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyDevice(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const attempt = attemptRef.current ?? signIn;
      const result = await attempt!.attemptSecondFactor({ strategy: "email_code", code: trustCode.trim() });
      if (result.status === "complete") await finish(result.createdSessionId);
      else setError(`Connexion incomplète (étape suivante demandée par Clerk : ${result.status}).`);
    } catch (err) {
      setError(clerkMessage(err, "Code de vérification invalide."));
    } finally {
      setIsSubmitting(false);
    }
  }

  const back = (
    <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline">
      ← Retour à la connexion
    </Link>
  );

  if (!arrivalReady) {
    return (
      <AuthShell title="Un instant…" subtitle="Fermeture de la session précédente.">
        <span />
      </AuthShell>
    );
  }

  if (step === "trust") {
    return (
      <AuthShell title="Vérifie ton email" subtitle={`Mot de passe changé. Nouvel appareil : un code a été envoyé à ${trustEmail}.`}>
        <form onSubmit={verifyDevice} className="flex flex-col gap-3">
          <input
            required
            value={trustCode}
            onChange={(e) => setTrustCode(e.target.value)}
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
        {back}
      </AuthShell>
    );
  }

  if (step === "reset") {
    return (
      <AuthShell title="Nouveau mot de passe" subtitle="Saisis le code reçu par email et choisis ton nouveau mot de passe.">
        <form onSubmit={resetPassword} className="flex flex-col gap-3">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Code reçu par email"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={authInputClass}
          />
          <PasswordInput value={password} onChange={setPassword} placeholder="Nouveau mot de passe" autoComplete="new-password" />
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Confirmer le mot de passe" autoComplete="new-password" />
          {info && !error ? <p className="text-sm" style={{ color: "#4A6E4F" }}>{info}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={isSubmitting} className={authButtonClass}>
            {isSubmitting ? "Enregistrement..." : "Changer le mot de passe"}
          </Button>
        </form>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void sendCode()}
          className="mt-4 block w-full text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline disabled:opacity-50"
        >
          Renvoyer le code
        </button>
        {back}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Indique l'adresse de ton compte : nous t'envoyons un code pour en choisir un nouveau.">
      <form onSubmit={sendCode} className="flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={authInputClass}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? "Envoi..." : "Recevoir un code"}
        </Button>
      </form>
      {back}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  // useSearchParams demande une frontière Suspense avec le rendu statique de Next.
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}
