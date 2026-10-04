"use client";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";

/** Retour de Google (ou d'un autre fournisseur) : Clerk termine la connexion ou l'inscription. */
export default function SsoCallbackPage() {
  return (
    <AuthShell title="Un instant…" subtitle="Nous terminons votre connexion.">
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/redirection"
        signUpForceRedirectUrl="/redirection"
        signInUrl="/login"
        signUpUrl="/register"
      />
      {/* Protection anti-robots de Clerk, nécessaire pour les inscriptions via Google. */}
      <div id="clerk-captcha" />
    </AuthShell>
  );
}
