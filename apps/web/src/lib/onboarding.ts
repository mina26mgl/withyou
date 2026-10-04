"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api, ApiError } from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Profil cliente tel que renvoyé par /users/me (champs de l'onboarding). */
export interface ConsumerProfile {
  nom: string | null;
  prenom: string | null;
  onboarding_done: boolean | null;
  type_peau: string[];
  preoccupations: string[];
  routine_actuelle: string[];
  sensibilite: number | null;
  /** Date de naissance (AAAA-MM-JJ…), renseignée sur /quiz-age. */
  birth_date: string | null;
  /** Précautions de /quiz-precautions (traitement-medical, actif-fort, grossesse). */
  precautions: string[];
}

/** Une étape de l'onboarding : chaque écran n'envoie que sa réponse. */
export interface OnboardingStep {
  nomComplet?: string;
  genre?: "homme" | "femme";
  /** AAAA-MM-JJ */
  dateNaissance?: string;
  typePeau?: string[];
  preoccupations?: string[];
  routineActuelle?: string[];
  precautions?: string[];
  sensibilite?: number;
  termine?: boolean;
}

export function saveOnboardingStep(token: string | null, step: OnboardingStep) {
  return api.patch<ConsumerProfile>("/users/me/onboarding", step, { token });
}

export async function uploadProfilePhoto(token: string | null, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE_URL}/users/me/photo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return res.json();
}

/**
 * Écrans du quiz : relit les réponses déjà enregistrées (pour reprendre un
 * onboarding interrompu) et enregistre la réponse avant de passer à la suite.
 */
export function useOnboardingStep() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [saved, setSaved] = useState<ConsumerProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.get<{ consomateur: ConsumerProfile | null }>("/users/me", { token: await getToken() });
        if (!cancelled) setSaved(me.consomateur);
      } catch (err) {
        console.error("Réponses de l'onboarding indisponibles:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  /** Renvoie true si la réponse est enregistrée ; sinon affiche l'erreur et reste sur l'écran. */
  async function save(step: OnboardingStep): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      await saveOnboardingStep(await getToken(), step);
      return true;
    } catch (err) {
      console.error("Étape de l'onboarding non enregistrée:", err);
      setError(
        err instanceof ApiError && err.status === 401
          ? "Votre session a expiré. Reconnectez-vous pour continuer."
          : "Impossible d'enregistrer votre réponse. Réessayez.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { saved, save, saving, error };
}
