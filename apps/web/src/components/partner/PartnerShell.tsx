"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { ArrowLeftRight, BarChart3, CreditCard, FlaskConical, Home, LogOut, Package, Palette, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";

const NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/page-marque", label: "Ma page marque", icon: Palette },
  { href: "/produits", label: "Produits", icon: Package },
  { href: "/analyses", label: "Ventes et analyses", icon: BarChart3 },
  { href: "/avis", label: "Avis clientes", icon: Star, badge: "reviews" as const },
  { href: "/mise-en-avant", label: "Mise en avant", icon: Sparkles },
  { href: "/salons", label: "Tests en salon", icon: FlaskConical },
  { href: "/abonnements", label: "Abonnements", icon: CreditCard },
];

export function PartnerShell({
  brandName,
  brandLogoUrl,
  accentColor,
  userEmail,
  unansweredReviews,
  verified,
  accountManager,
  children,
}: {
  brandName: string;
  brandLogoUrl: string | null;
  accentColor: string;
  userEmail: string | null;
  unansweredReviews: number;
  /** Page validée par withyou : cachet affiché à côté du nom. */
  verified: boolean;
  /** Prénom du chargé de compte withyou assigné à la marque. */
  accountManager: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const [switching, setSwitching] = useState(false);

  /** Même compte, même session : on ouvre l'app cliente (profil cliente créé au besoin). */
  async function openConsumerSpace() {
    setSwitching(true);
    let onboardingDone = true;
    try {
      onboardingDone = (await api.post<{ onboardingDone: boolean }>("/users/me/espace-cliente", undefined, { token: await getToken() })).onboardingDone;
    } catch (err) {
      console.error("Profil cliente indisponible:", err);
    }
    // Premier passage : le questionnaire de peau ; ensuite, l'accueil de l'app.
    router.push(onboardingDone ? "/home" : "/");
  }

  return (
    <div className="grid min-h-[100dvh] grid-cols-[252px_minmax(0,1fr)] bg-partner-bg text-partner-ink max-[900px]:grid-cols-1">
      <aside
        className="sticky top-0 z-20 flex h-[100dvh] flex-col gap-5 overflow-y-auto border-r border-partner-border bg-partner-card px-3.5 py-6 max-[900px]:h-auto max-[900px]:flex-row max-[900px]:items-center max-[900px]:gap-3 max-[900px]:overflow-x-auto max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:px-3 max-[900px]:py-2.5"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
        aria-label="Navigation"
      >
        <Link
          href="/accueil"
          className="px-2.5 font-partner-heading text-[30px] leading-none text-partner-heading max-[900px]:px-1 max-[900px]:text-2xl"
        >
          withyou
          <small className="mt-1.5 block font-partner text-[12.5px] text-partner-muted max-[900px]:hidden">Espace marque</small>
        </Link>
        <Link
          href="/mon-profil"
          title="Mon profil"
          aria-current={pathname?.startsWith("/mon-profil") ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-2xl border border-partner-border bg-partner-bg p-2.5 hover:border-partner-heading/40 max-[900px]:hidden",
            pathname?.startsWith("/mon-profil") && "border-partner-heading/40 bg-partner-soft",
          )}
        >
          {/* Logo souvent transparent : fond blanc derrière. Sans logo : image de profil par défaut. */}
          <div className="grid h-[38px] w-[38px] flex-none place-items-center overflow-hidden rounded-full border border-[#E6ECEA] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brandLogoUrl || DEFAULT_AVATAR} alt="" className={`h-full w-full object-contain ${brandLogoUrl ? "p-1" : "p-[12%]"}`} />
          </div>
          <div className="min-w-0 flex-1">
            {/* Cachet collé au nom, sur la même ligne. */}
            <b className="flex min-w-0 items-center gap-1.5 text-sm leading-tight">
              <span className="truncate">{brandName || "Votre marque"}</span>
              {verified && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/cachet.png"
                  alt="Cachet Vérifiée par withyou"
                  title="Vérifiée par withyou"
                  className="h-[18px] w-[18px] flex-none object-contain"
                  style={{ filter: "drop-shadow(0.5px 1px 1px rgba(0,0,0,.2))" }}
                />
              )}
            </b>
            {verified ? (
              <span className="block whitespace-nowrap text-xs font-semibold text-partner-leaf">Vérifiée par withyou</span>
            ) : (
              <span className="block whitespace-nowrap text-xs font-medium text-partner-muted">En attente de vérification</span>
            )}
          </div>
        </Link>
        {userEmail && (
          <p className="m-0 -mt-3 truncate px-1 text-xs text-partner-muted max-[900px]:hidden" title={userEmail}>
            Connecté : {userEmail}
          </p>
        )}
        <button
          type="button"
          onClick={() => void openConsumerSpace()}
          disabled={switching}
          title="Ouvrir l'app withyou avec le même compte"
          className="-mt-2 flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-partner-heading/25 bg-white px-4 py-2 text-[13.5px] font-semibold text-partner-heading hover:border-partner-heading/50 hover:bg-partner-soft disabled:opacity-60 max-[900px]:mt-0 max-[900px]:min-h-10 max-[900px]:flex-none"
        >
          <ArrowLeftRight className="h-4 w-4 flex-none" aria-hidden="true" />
          {switching ? "Ouverture…" : "Mon espace cliente"}
        </button>
        <nav className="flex flex-col gap-0.5 max-[900px]:flex-row">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const count = item.badge === "reviews" ? unansweredReviews : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14.5px] font-medium text-partner-muted",
                  "hover:bg-partner-bg hover:text-partner-ink",
                  active && "bg-partner-soft font-semibold text-partner-heading",
                )}
              >
                <Icon className="h-5 w-5 flex-none" aria-hidden="true" />
                <span>{item.label}</span>
                {count > 0 && (
                  <span
                    className="ml-auto rounded-full bg-partner-leafBg px-[7px] py-px text-[11px] font-bold text-partner-heading"
                    aria-label={`${count} avis sans réponse`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="flex min-h-11 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14.5px] font-medium text-partner-muted hover:bg-partner-bg hover:text-partner-ink"
        >
          <LogOut className="h-5 w-5 flex-none" aria-hidden="true" />
          <span>Se déconnecter</span>
        </button>
        <div
          className="mt-auto rounded-2xl p-3.5 text-[13px] max-[900px]:hidden"
          style={{ background: "linear-gradient(180deg, #D3E9F2, #F1F8FA)" }}
        >
          <b className="mb-1 block font-partner-heading text-[17px] font-normal text-partner-heading">Besoin d&apos;aide ?</b>
          {accountManager
            ? `${accountManager}, votre contact chez withyou, vous répond sous 24 h.`
            : "L'équipe withyou vous répond sous 24 h."}
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-[72px] pt-6 max-[900px]:px-3.5 max-[900px]:pt-4 lg:px-6 xl:px-10" tabIndex={-1}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px]">{children}</div>
      </main>
    </div>
  );
}
