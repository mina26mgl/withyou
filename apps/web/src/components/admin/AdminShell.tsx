"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { BarChart3, CreditCard, Gift, Home, LogOut, Scissors, ShieldCheck, ShoppingBag, Store, Truck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_ROLE_LABEL } from "@/lib/adminApi";
import { AdminAvatar } from "./AdminAvatar";
import { useAdmin } from "./AdminContext";

/** Menu de la console, dans l'ordre du prototype (docs/prototype/withyou-console-admin.html). */
const NAV = [
  { href: "/admin", label: "Vue du jour", icon: Home },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/livraisons", label: "Livraisons", icon: Truck },
  { href: "/admin/validations", label: "Validations", icon: ShieldCheck, badge: "validations" as const },
  { href: "/admin/marques", label: "Marques", icon: Store },
  { href: "/admin/abonnements", label: "Abonnements", icon: CreditCard, badge: "subscriptions" as const },
  { href: "/admin/salons", label: "Salons partenaires", icon: Scissors },
  { href: "/admin/specialistes", label: "Spécialistes beauté", icon: Users },
  { href: "/admin/box", label: "Box Rituel", icon: Gift },
  { href: "/admin/analyses", label: "Analyses", icon: BarChart3 },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { me, overview } = useAdmin();
  const pending = overview ? overview.pendingPages + overview.pendingBrandRequests : 0;
  const onProfile = pathname?.startsWith("/admin/profil");

  return (
    <div className="grid min-h-[100dvh] grid-cols-[252px_minmax(0,1fr)] bg-partner-bg text-partner-ink max-[900px]:grid-cols-1">
      <aside
        className="sticky top-0 z-20 flex h-[100dvh] flex-col gap-5 overflow-y-auto border-r border-partner-border bg-partner-card px-3.5 py-6 max-[900px]:h-auto max-[900px]:flex-row max-[900px]:items-center max-[900px]:gap-3 max-[900px]:overflow-x-auto max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:px-3 max-[900px]:py-2.5"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
        aria-label="Navigation"
      >
        <Link
          href="/admin"
          className="px-2.5 font-partner-heading text-[30px] leading-none text-partner-heading max-[900px]:px-1 max-[900px]:text-2xl"
        >
          withyou
          <small className="mt-1.5 block font-partner text-[12.5px] text-partner-muted max-[900px]:hidden">Console admin</small>
        </Link>
        <Link
          href="/admin/profil"
          aria-current={onProfile ? "page" : undefined}
          title="Mon profil"
          className={cn(
            "flex items-center gap-2.5 rounded-2xl border border-partner-border bg-partner-bg p-2.5 hover:border-partner-heading/40 max-[900px]:hidden",
            onProfile && "border-partner-heading/40 bg-partner-soft",
          )}
        >
          <AdminAvatar prenom={me?.prenom ?? ""} nom={me?.nom ?? ""} photoUrl={me?.photoUrl ?? null} size={38} />
          <div className="min-w-0">
            <b className="block truncate text-sm leading-tight">{me ? `${me.prenom} ${me.nom}`.trim() : "…"}</b>
            <span className="text-xs font-medium text-partner-muted">{me ? (ADMIN_ROLE_LABEL[me.roleAdmin] ?? me.roleAdmin) : ""}</span>
          </div>
        </Link>
        {me && (
          <p className="m-0 -mt-3 truncate px-1 text-xs text-partner-muted max-[900px]:hidden" title={me.email}>
            Connecté : {me.email}
          </p>
        )}
        <nav className="flex flex-col gap-0.5 max-[900px]:flex-row">
          {NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
            const Icon = item.icon;
            const count =
              item.badge === "validations" ? pending : item.badge === "subscriptions" ? (overview?.pendingSubscriptions ?? 0) : 0;
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
                  <span className="ml-auto rounded-full bg-partner-leafBg px-[7px] py-px text-[11px] font-bold text-partner-heading" aria-label={`${count} en attente`}>
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
        <div className="mt-auto rounded-2xl p-3.5 text-[13px] max-[900px]:hidden" style={{ background: "linear-gradient(180deg, #D3E9F2, #F1F8FA)" }}>
          <b className="mb-1 block font-partner-heading text-[17px] font-normal text-partner-heading">Espace marque</b>
          Voir ce que les marques voient, pour vérifier une page ou un produit.
        </div>
      </aside>
      <main className="min-w-0 px-4 pb-[72px] pt-6 max-[900px]:px-3.5 max-[900px]:pt-4 lg:px-6 xl:px-10" tabIndex={-1}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-[18px]">{children}</div>
      </main>
    </div>
  );
}
