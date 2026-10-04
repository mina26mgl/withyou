"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Gift, ShieldCheck, Store, Truck } from "lucide-react";
import type { AdminIncidentType } from "@withyou/shared-types";
import { useAdmin } from "@/components/admin/AdminContext";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillLink } from "@/components/partner/PillButton";
import { EmptyState, KpiGrid, Panel } from "@/components/partner/ui-blocks";
import { adminApi, sinceLabel } from "@/lib/adminApi";
import { usePartnerData } from "@/lib/usePartnerData";
import { useDaytime } from "@/lib/useDaytime";

/** Action proposée pour débloquer, comme dans le prototype. */
const INCIDENT_ACTION: Record<AdminIncidentType, string> = {
  BRAND: "Relancer la marque",
  CLIENT: "Reprogrammer la livraison",
  PAYMENT: "Vérifier le paiement",
  QUALITY: "Suivre le remplacement",
  CARRIER: "Ouvrir un ticket transporteur",
};

/** « Box d'octobre », « Box de novembre » : la box du mois qui vient. */
function boxTitle() {
  const d = new Date();
  const month = new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("fr-FR", { month: "long" });
  return `Box ${/^[aeiouyéèêâîôû]/i.test(month) ? "d'" : "de "}${month}`;
}

const TONES = {
  danger: "bg-partner-dangerBg text-partner-danger",
  warn: "bg-partner-warnBg text-partner-warn",
  info: "bg-partner-infoBg text-partner-info",
};

function DecidePanel({
  title,
  count,
  tone,
  href,
  linkLabel,
  sub,
  empty,
  items,
}: {
  title: string;
  count: number;
  tone: keyof typeof TONES;
  href: string;
  linkLabel: string;
  sub: string;
  empty: string;
  items: { key: string; icon: React.ReactNode; iconClass?: string; title: string; detail: string; action: { href: string; label: string } }[];
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <h2 className="flex items-center gap-2.5 font-partner-heading text-[22px] text-partner-heading">
          {title}
          <span className={`rounded-full px-[9px] py-0.5 font-partner text-[13px] font-bold ${TONES[tone]}`}>{count}</span>
        </h2>
        <PillLink href={href} variant="ghost" size="sm">
          {linkLabel}
        </PillLink>
      </div>
      <p className="mb-4 mt-1 text-[13.5px] text-partner-muted">{sub}</p>
      {items.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 border-b border-partner-border py-3 last:border-b-0">
              <span className={`grid h-[38px] w-[38px] flex-none place-items-center rounded-xl bg-partner-bg ${it.iconClass ?? "text-partner-heading"}`}>
                {it.icon}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm leading-tight">{it.title}</b>
                <span className="text-[12.5px] text-partner-muted">{it.detail}</span>
              </span>
              <Link
                href={it.action.href}
                className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold hover:border-partner-muted"
              >
                {it.action.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

export default function AdminTodayPage() {
  const { me, overview } = useAdmin();
  const queue = usePartnerData((token) => adminApi.validations(token));
  const pending = queue.data ?? [];
  const incidents = overview?.incidents ?? [];
  // Côté livraison : colis bloqué chez le transporteur ou cliente injoignable.
  const anomalies = incidents.filter((i) => i.type === "CARRIER" || i.type === "CLIENT");
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const { greeting } = useDaytime();

  return (
    <>
      <PageHeader
        title={`${greeting} ${me?.prenom ?? ""}.`}
        subtitle={`${today.charAt(0).toUpperCase()}${today.slice(1)}. Voici ce qui attend une décision aujourd'hui.`}
        actions={<PillLink href="/admin/marques" variant="ghost">Voir les marques</PillLink>}
      />

      <section className="rounded-3xl border border-partner-border bg-partner-card px-[30px] pb-[26px] pt-[30px]">
        <p className="m-0 max-w-[34ch] font-partner-heading text-[clamp(22px,2.4vw,31px)] leading-[1.28] text-partner-heading">
          Aujourd&apos;hui, {plural(pending.length, "validation attend", "validations attendent")} une décision
          {overview && overview.openIncidents > 0 ? ` et ${plural(overview.openIncidents, "commande est bloquée", "commandes sont bloquées")}` : ""}.
        </p>
        {overview && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-partner-leafBg px-[11px] py-1 text-[13px] font-bold text-partner-leaf">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {plural(overview.activeBrands, "marque active", "marques actives")}
            </span>
            <span className="inline-flex items-center rounded-full bg-partner-leafBg px-[11px] py-1 text-[13px] font-bold text-partner-leaf">
              {plural(overview.onlineProducts, "produit en ligne", "produits en ligne")}
            </span>
            {overview.suspendedBrands > 0 && (
              <span className="inline-flex items-center rounded-full bg-partner-warnBg px-[11px] py-1 text-[13px] font-bold text-partner-warn">
                {plural(overview.suspendedBrands, "marque suspendue", "marques suspendues")}
              </span>
            )}
          </div>
        )}
      </section>

      {overview && (
        <KpiGrid
          items={[
            { label: "Pages marque à valider", value: String(overview.pendingPages) },
            { label: "Nouvelles marques", value: String(overview.pendingBrandRequests), note: "dossiers à examiner", tone: "muted" },
            { label: "Marques actives", value: String(overview.activeBrands) },
            { label: "Commandes bloquées", value: String(overview.openIncidents), tone: overview.openIncidents ? "down" : "muted", note: overview.openIncidents ? "à traiter en priorité" : undefined },
          ]}
        />
      )}

      {/* Les 4 décisions du jour, dans l'ordre du prototype. */}
      <div className="grid grid-cols-2 gap-[18px] max-[1180px]:grid-cols-1">
        <DecidePanel
          title="Commandes bloquées"
          count={incidents.length}
          tone="danger"
          href="/admin/commandes"
          linkLabel="Toutes"
          sub="L'étape qui bloque, et l'action pour débloquer."
          empty="Aucune commande bloquée."
          items={incidents.slice(0, 4).map((i) => ({
            key: i.id,
            icon: <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />,
            iconClass: "text-partner-danger",
            title: [i.orderCode, i.client, i.wilaya].filter(Boolean).join(", "),
            detail: i.reason,
            action: { href: `/admin/commandes#${i.orderId}`, label: "Ouvrir" },
          }))}
        />

        <DecidePanel
          title="Validations Charte"
          count={pending.length}
          tone="warn"
          href="/admin/validations"
          linkLabel="Toutes"
          sub="Rien n'est publié sans passer par la Charte Beauté Pure."
          empty={queue.loading ? "Chargement…" : "Aucune validation en attente."}
          items={pending.slice(0, 4).map((v) => ({
            key: `${v.kind}-${v.id}`,
            icon: v.kind === "brand" ? <Store className="h-[18px] w-[18px]" aria-hidden="true" /> : <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />,
            title: `${v.brand} : ${v.title}`,
            detail: sinceLabel(v.since),
            action: { href: `/admin/validations#${v.kind}-${v.id}`, label: "Examiner" },
          }))}
        />

        <DecidePanel
          title={overview?.box?.nom.replace("Box Rituel", "Box") ?? boxTitle()}
          count={overview?.box?.manques.length ?? 0}
          tone="warn"
          href="/admin/box"
          linkLabel="Préparer"
          sub="Produits dont le stock ne couvre pas encore les abonnées."
          empty={overview?.box ? "Tous les produits sont réunis." : "Aucune box en préparation pour le moment."}
          items={(overview?.box?.manques ?? []).map((p) => ({
            key: p.id,
            icon: <Gift className="h-[18px] w-[18px]" aria-hidden="true" />,
            title: `${p.nom}, ${p.marque}`,
            detail:
              p.etat === "ATTENTE"
                ? `Marque sans réponse, ${p.besoin.toLocaleString("fr-FR")} unités attendues`
                : `Il manque ${(p.besoin - p.confirme).toLocaleString("fr-FR")} unités sur ${p.besoin.toLocaleString("fr-FR")}`,
            action: { href: "/admin/box", label: "Relancer" },
          }))}
        />

        <DecidePanel
          title="Livraisons en anomalie"
          count={anomalies.length}
          tone="info"
          href="/admin/livraisons"
          linkLabel="Suivi"
          sub="Colis immobiles ou clientes injoignables."
          empty="Aucune anomalie en cours."
          items={anomalies.slice(0, 4).map((i) => ({
            key: i.id,
            icon: <Truck className="h-[18px] w-[18px]" aria-hidden="true" />,
            title: [i.orderCode, i.carrier].filter(Boolean).join(", "),
            detail: i.reason,
            action: { href: `/admin/commandes#${i.orderId}`, label: INCIDENT_ACTION[i.type] },
          }))}
        />
      </div>
    </>
  );
}
