"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { fetchMe, homePathFor, landingPathFor, loginSpaceError, takeLoginSpace } from "@/lib/homePath";

/**
 * Après une connexion ou une inscription avec Google : crée le compte withyou
 * s'il n'existe pas encore (/users/me), puis envoie chacun dans son espace. Une
 * marque en attente arrive sur son dossier (« Ma demande »). Une connexion
 * Google partie du formulaire de connexion suit le toggle « Espace
 * consommatrice » ; un compte consommatrice qui vise l'espace pro revient au
 * formulaire, déconnecté.
 */
export default function RedirectionPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login");
      return;
    }
    void (async () => {
      try {
        const me = await fetchMe(await getToken());
        const space = takeLoginSpace();
        if (space && loginSpaceError(me, space)) {
          await clerk.signOut({ redirectUrl: `/login?refus=${space}` });
          return;
        }
        router.replace(space ? landingPathFor(me, space) : homePathFor(me));
      } catch (err) {
        console.error("Compte withyou indisponible:", err);
        setError("Votre compte est connecté, mais le serveur withyou ne répond pas. Réessayez dans un instant.");
      }
    })();
  }, [isLoaded, isSignedIn, getToken, router, clerk]);

  return (
    <AuthShell title={error ? "Oups" : "Un instant…"} subtitle={error ?? "Nous ouvrons votre espace."}>
      {error ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="block w-full text-center text-sm font-semibold text-[#07320D] underline-offset-2 hover:underline"
        >
          Réessayer
        </button>
      ) : (
        <span />
      )}
    </AuthShell>
  );
}
