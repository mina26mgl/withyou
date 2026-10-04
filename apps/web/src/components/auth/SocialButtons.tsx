"use client";
import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { clerkMessage } from "@/lib/clerkError";

type OAuthStrategy = "oauth_google";

/**
 * Fournisseurs activés dans le tableau de bord Clerk (User & Authentication →
 * SSO connections). Pour en ajouter un (Apple, Facebook…), l'activer chez Clerk
 * puis l'ajouter ici.
 */
const PROVIDERS: { strategy: OAuthStrategy; label: string; Icon: () => React.ReactElement }[] = [
  { strategy: "oauth_google", label: "Continuer avec Google", Icon: GoogleIcon },
];

/** Après Google, Clerk revient sur /sso-callback puis sur /redirection (aiguillage selon le compte). */
const REDIRECT = { redirectUrl: "/sso-callback", redirectUrlComplete: "/redirection" };

export function SocialButtons({
  mode,
  unsafeMetadata,
  disabled,
  disabledHint,
  onBeforeRedirect,
}: {
  mode: "signIn" | "signUp";
  /** Inscription : type de compte choisi (cliente ou marque), lu par le backend. */
  unsafeMetadata?: Record<string, unknown>;
  disabled?: boolean;
  /** Pourquoi les boutons sont désactivés (ex. nom de la marque manquant). */
  disabledHint?: string;
  /** Appelé juste avant de partir chez le fournisseur (ex. retenir l'espace choisi). */
  onBeforeRedirect?: () => void;
}) {
  const signIn = useSignIn();
  const signUp = useSignUp();
  const [busy, setBusy] = useState<OAuthStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(strategy: OAuthStrategy) {
    setError(null);
    setBusy(strategy);
    try {
      onBeforeRedirect?.();
      if (mode === "signUp") {
        if (!signUp.isLoaded) return;
        await signUp.signUp.authenticateWithRedirect({ strategy, ...REDIRECT, unsafeMetadata });
      } else {
        if (!signIn.isLoaded) return;
        await signIn.signIn.authenticateWithRedirect({ strategy, ...REDIRECT });
      }
    } catch (err) {
      setError(clerkMessage(err, "Connexion avec ce service impossible. Réessayez."));
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {PROVIDERS.map(({ strategy, label, Icon }) => (
        <button
          key={strategy}
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void start(strategy)}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-[#DCE8DF] bg-white text-sm font-semibold text-[#07320D] transition hover:border-[#4A6E4F] hover:shadow-[0_6px_20px_rgba(7,50,13,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon />
          {busy === strategy ? "Redirection…" : label}
        </button>
      ))}
      {disabled && disabledHint ? <p className="-mt-1 text-center text-xs" style={{ color: "#4A6E4F" }}>{disabledHint}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex items-center gap-3 text-xs" style={{ color: "#4A6E4F" }}>
        <span className="h-px flex-1 bg-[#DCE8DF]" />
        ou avec votre email
        <span className="h-px flex-1 bg-[#DCE8DF]" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
