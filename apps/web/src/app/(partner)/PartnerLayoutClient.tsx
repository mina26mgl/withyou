"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { PartnerSummaryContext } from "@/components/partner/PartnerSummaryContext";
import { api } from "@/lib/api";
import { partnerApi } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

export default function PartnerLayoutClient({ children }: { children: React.ReactNode }) {
  const { data: summary, reload, error, getToken } = usePartnerData((token) => partnerApi.getSummary(token));
  const value = useMemo(() => ({ summary, refresh: reload }), [summary, reload]);
  const pathname = usePathname();
  const router = useRouter();

  // Pas d'accès à l'espace marque : une marque encore en attente va sur son dossier.
  useEffect(() => {
    if (!error) return;
    void (async () => {
      try {
        const me = await api.get<{ user: { role: string }; partnerStatus: "NONE" | "PENDING" | "REJECTED" | "ACTIVE" }>("/users/me", {
          token: await getToken(),
        });
        if (me.partnerStatus === "PENDING" || me.partnerStatus === "REJECTED") router.replace("/ma-demande");
      } catch {
        // Serveur injoignable : la page affiche déjà l'erreur.
      }
    })();
  }, [error, getToken, router]);

  // Marque pas encore préparée : l'arrivée dans l'espace (après connexion) se fait
  // directement sur la page de préparation de la marque.
  useEffect(() => {
    if (summary?.brandSetupPending && pathname === "/accueil") router.replace("/page-marque");
  }, [summary?.brandSetupPending, pathname, router]);

  return (
    <PartnerSummaryContext.Provider value={value}>
      <PartnerShell
        brandName={summary?.brandName ?? ""}
        brandLogoUrl={summary?.logoUrl ?? null}
        accentColor={summary?.accentColor ?? "#8E4B5A"}
        userEmail={summary?.userEmail ?? null}
        unansweredReviews={summary?.unansweredReviews ?? 0}
        verified={summary?.verified ?? false}
        accountManager={summary?.accountManager ?? null}
      >
        {children}
      </PartnerShell>
    </PartnerSummaryContext.Provider>
  );
}
