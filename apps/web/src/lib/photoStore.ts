"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "./api";

// Photo choisie pendant l'onboarding, affichée tout de suite (avant la réponse du serveur).
let _url: string | null = null;
const listeners = new Set<(url: string) => void>();

/** Change la photo affichée partout (profil, barre de navigation) sans recharger. */
export function setProfilePhoto(url: string) {
  _url = url;
  listeners.forEach((l) => l(url));
}

export function getProfilePhoto(): string | null {
  return _url;
}

/**
 * Photo de profil de la personne connectée : celle choisie à l'instant, sinon
 * celle enregistrée (user.pdpurl). null → afficher l'image par défaut.
 */
export function useProfilePhoto(): string | null {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [url, setUrl] = useState<string | null>(() => _url);

  useEffect(() => {
    listeners.add(setUrl);
    return () => {
      listeners.delete(setUrl);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const me = await api.get<{ user: { pdpurl: string | null } }>("/users/me", { token: await getToken() });
        if (!cancelled) setUrl((current) => current ?? me.user.pdpurl);
      } catch (err) {
        console.error("Photo de profil indisponible:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return url;
}
