"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

/**
 * Pages de connexion, d'inscription et de mot de passe oublié : une session
 * encore ouverte (autre compte) bloquerait Clerk. On la ferme dès l'arrivée, en
 * restant sur la même page : `signOut()` sans adresse renverrait vers l'accueil.
 * Renvoie true quand la page peut être utilisée.
 */
export function useSignedOutOnArrival(): boolean {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [ready, setReady] = useState(false);
  const signingOut = useRef(false);

  useEffect(() => {
    // Une fois prête, une connexion réussie sur la page ne doit pas être défaite.
    if (!isLoaded || ready) return;
    if (!isSignedIn) {
      setReady(true);
      return;
    }
    if (signingOut.current) return;
    signingOut.current = true;
    void clerk.signOut({ redirectUrl: window.location.pathname + window.location.search });
  }, [isLoaded, isSignedIn, ready, clerk]);

  return ready;
}
