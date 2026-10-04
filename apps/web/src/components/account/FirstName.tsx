"use client";
import { useOnboardingStep } from "@/lib/onboarding";

/** Prénom de la cliente connectée (profil cliente), vide tant qu'il n'est pas connu. */
export function FirstName({ className }: { className?: string }) {
  const { saved } = useOnboardingStep();
  return saved?.prenom ? <span className={className}>{saved.prenom}</span> : null;
}
