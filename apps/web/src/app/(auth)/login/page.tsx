"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Button } from "@/components/ui/button";
import { AuthShell, authInputClass, authButtonClass } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { ConsumerToggle } from "@/components/auth/ConsumerToggle";
import { useSignedOutOnArrival } from "@/components/auth/useSignedOutOnArrival";
import { clerkMessage } from "@/lib/clerkError";
import {
  fetchMe,
  landingPathFor,
  loginSpaceError,
  rememberLoginSpace,
  PRO_SPACE_REFUSAL,
  type LoginSpace,
} from "@/lib/homePath";

export default function LoginPage() {
  const router = useRouter();
  const { isLoaded, signIn } = useSignIn();
  const arrivalReady = useSignedOutOnArrival();
  const clerk = useClerk();
  // Tentative en cours (peut venir d'un nouveau client Clerk après déconnexion).
  const attemptRef = useRef<Awaited<ReturnType<NonNullable<typeof signIn>["create"]>> | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Clerk « Device Trust » : connexion depuis un appareil inconnu → code envoyé par email.
  const [trustEmail, setTrustEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Activé : connexion à l'app cliente ; désactivé : espace marque / admin.
  const [consumer, setConsumer] = useState(false);
  const space: LoginSpace = consumer ? "consumer" : "pro";

  // Retour d'une connexion Google refusée (/redirection) : on garde l'espace choisi et on explique.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("refus") !== "pro") return;
    setError(PRO_SPACE_REFUSAL);
    params.delete("refus");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Une session déjà ouverte a été fermée à l'arrivée (useSignedOutOnArrival).
      const result = await signIn.create({ identifier: email, password });
      attemptRef.current = result;
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        await goHome();
      } else if (result.status === "needs_client_trust" || result.status === "needs_second_factor") {
        const emailFactor = result.supportedSecondFactors?.find((f) => f.strategy === "email_code");
        if (!emailFactor || emailFactor.strategy !== "email_code") {
          setError("Vérification supplémentaire requise, mais aucun code par email n'est disponible pour ce compte.");
          return;
        }
        await result.prepareSecondFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
        setTrustEmail(emailFactor.safeIdentifier);
      } else {
        setError(`Connexion incomplète (étape suivante demandée par Clerk : ${result.status}).`);
      }
    } catch (err) {
      console.error("Clerk sign-in refused:", err);
      setError(clerkMessage(err, "Connexion impossible. Réessayez."));
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Toggle activé : app cliente, quel que soit le compte. Sinon chacun arrive
   * dans son espace (console admin, espace marque) ; un compte consommatrice y
   * est refusé : la session est refermée et le formulaire explique quoi changer.
   */
  async function goHome() {
    let refusal: string | null;
    try {
      const me = await fetchMe(await clerk.session?.getToken());
      refusal = loginSpaceError(me, space);
      if (!refusal) {
        router.push(landingPathFor(me, space));
        return;
      }
    } catch (err) {
      console.error("Compte withyou indisponible:", err);
      refusal = "Votre compte est connecté, mais le serveur withyou ne répond pas. Réessayez dans un instant.";
    }
    await clerk.signOut({ redirectUrl: window.location.pathname + window.location.search });
    attemptRef.current = null;
    setTrustEmail(null);
    setCode("");
    setError(refusal);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const attempt = attemptRef.current ?? signIn;
      const result = await attempt.attemptSecondFactor({ strategy: "email_code", code });
      if (result.status === "complete") {
        await clerk.setActive({ session: result.createdSessionId });
        await goHome();
      } else {
        setError(`Connexion incomplète (étape suivante demandée par Clerk : ${result.status}).`);
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

  if (trustEmail) {
    return (
      <AuthShell title="Vérifie ton email" subtitle={`Nouvel appareil : un code a été envoyé à ${trustEmail}.`}>
        <form onSubmit={handleVerifyCode} className="flex flex-col gap-3">
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
        <button
          type="button"
          onClick={() => {
            setTrustEmail(null);
            setCode("");
            setError(null);
          }}
          className="mt-6 block w-full text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline"
        >
          ← Retour
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Connexion" subtitle="Heureux de vous revoir">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <ConsumerToggle checked={consumer} onChange={setConsumer} />
        <SocialButtons mode="signIn" onBeforeRedirect={() => rememberLoginSpace(space)} />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={authInputClass}
        />
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <Link
          href={email.trim() ? `/mot-de-passe-oublie?email=${encodeURIComponent(email.trim())}` : "/mot-de-passe-oublie"}
          className="-mt-1 self-end text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline"
        >
          Mot de passe oublié ?
        </Link>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={isSubmitting} className={authButtonClass}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm" style={{ color: "#4A6E4F" }}>
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-semibold text-[#07320D] underline-offset-2 hover:underline">
          Inscrivez-vous
        </Link>
      </p>
    </AuthShell>
  );
}
