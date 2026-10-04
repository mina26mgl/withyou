"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { AdminOffer, AdminOfferInput, AdminSubscription, SubscriptionStatus } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { useAdmin } from "@/components/admin/AdminContext";
import { BrandAvatar } from "@/components/admin/BrandAvatar";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill, type StatusTone } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, KpiGrid, LoadError, Panel, PanelHeader, Tabs } from "@/components/partner/ui-blocks";
import { adminApi, sinceLabel } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

type Tab = "requests" | "active" | "history";
const STATUS: Record<SubscriptionStatus, [StatusTone, string]> = {
  DEMANDE: ["info", "À activer"],
  ACTIF: ["ok", "Actif"],
  EXPIRE: ["warn", "Expiré"],
  REFUSE: ["mute", "Refusé"],
  ANNULE: ["mute", "Arrêté"],
};
const FEATURE_LABEL = { ANALYTICS: "Écran Ventes et analyses", PROMOTION: "Écran Mise en avant" } as const;
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);

export default function AdminSubscriptionsPage() {
  const { refresh } = useAdmin();
  const subs = usePartnerData((token) => adminApi.subscriptions(token));
  const offers = usePartnerData((token) => adminApi.offers(token));
  const [tab, setTab] = useState<Tab>("requests");
  const [editing, setEditing] = useState<AdminOffer | "new" | null>(null);
  const [stopping, setStopping] = useState<{ sub: AdminSubscription; action: "refuser" | "arreter" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { message, show } = useToast();
  const all = subs.data ?? [];

  const groups: Record<Tab, AdminSubscription[]> = {
    requests: all.filter((s) => s.statut === "DEMANDE"),
    active: all.filter((s) => s.statut === "ACTIF"),
    history: all.filter((s) => s.statut !== "DEMANDE" && s.statut !== "ACTIF"),
  };
  const list = groups[tab];
  const monthly = groups.active.reduce((a, s) => a + (s.periode === "ANNUEL" ? s.prix / 12 : s.prix), 0);

  function changed(toast: string) {
    void subs.reload();
    void offers.reload();
    refresh();
    show(toast);
  }

  async function act(s: AdminSubscription, action: "activer" | "renouveler") {
    const token = await subs.getToken();
    if (!token) return;
    setBusyId(s.id);
    try {
      await adminApi.subscriptionAction(token, s.id, action);
      changed(action === "activer" ? `${s.offre} activé pour ${s.marque}.` : `${s.offre} de ${s.marque} renouvelé d'une période.`);
    } catch (e) {
      show(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Abonnements"
        subtitle="En plus de la commission, les marques peuvent s'abonner à des outils. Elles font la demande depuis leur espace ; vous l'activez à réception du paiement."
        actions={
          <PillButton onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter une offre
          </PillButton>
        }
      />
      <KpiGrid
        items={[
          { label: "Demandes à activer", value: String(groups.requests.length), tone: groups.requests.length ? "down" : "muted", note: groups.requests.length ? "paiement à vérifier" : undefined },
          { label: "Abonnements actifs", value: String(groups.active.length) },
          { label: "Revenu mensuel récurrent", value: formatPrice(Math.round(monthly)), note: "annuels ramenés au mois", tone: "muted" },
          { label: "Expirent sous 15 jours", value: String(groups.active.filter((s) => (daysLeft(s.fin) ?? 99) <= 15).length), tone: "muted" },
        ]}
      />

      <Panel>
        <div className="mb-3.5">
          <Tabs<Tab>
            label="Filtrer les abonnements"
            value={tab}
            onChange={setTab}
            items={[
              { key: "requests", label: "Demandes", count: groups.requests.length },
              { key: "active", label: "Actifs", count: groups.active.length },
              { key: "history", label: "Historique", count: groups.history.length },
            ]}
          />
        </div>
        {subs.error ? (
          <LoadError what="les abonnements" message={subs.errorMessage} />
        ) : list.length === 0 ? (
          <EmptyState>
            {subs.loading ? "Chargement…" : tab === "requests" ? "Aucune demande en attente." : tab === "active" ? "Aucun abonnement actif." : "Rien dans l'historique."}
          </EmptyState>
        ) : (
          list.map((s) => {
            const [tone, label] = STATUS[s.statut];
            const left = daysLeft(s.fin);
            return (
              <div key={s.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-partner-border py-3.5 last:border-b-0 max-[800px]:grid-cols-[auto_minmax(0,1fr)]">
                <BrandAvatar name={s.marque} logoUrl={s.logoUrl} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="leading-tight">
                      {s.marque} : {s.offre}
                    </b>
                    <StatusPill tone={tone}>{label}</StatusPill>
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-partner-muted">
                    {formatPrice(s.prix)} {s.periode === "ANNUEL" ? "par an" : "par mois"}
                    {s.statut === "DEMANDE" && ` · demandé ${sinceLabel(s.demandeAt)}`}
                    {s.statut === "ACTIF" && ` · du ${fmtDate(s.debut)} au ${fmtDate(s.fin)}${left !== null && left <= 15 ? ` (plus que ${left} j)` : ""}`}
                    {(s.statut === "EXPIRE" || s.statut === "ANNULE") && ` · fin le ${fmtDate(s.fin)}`}
                    {s.activePar && ` · activé par ${s.activePar}`}
                    {s.message && ` · ${s.message}`}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 max-[800px]:col-span-2">
                  {s.statut === "DEMANDE" && (
                    <>
                      <PillButton variant="ghost" size="sm" onClick={() => setStopping({ sub: s, action: "refuser" })}>
                        Refuser
                      </PillButton>
                      <PillButton size="sm" disabled={busyId === s.id} onClick={() => act(s, "activer")}>
                        Paiement reçu : activer
                      </PillButton>
                    </>
                  )}
                  {(s.statut === "ACTIF" || s.statut === "EXPIRE") && (
                    <PillButton variant="ghost" size="sm" disabled={busyId === s.id} onClick={() => act(s, "renouveler")}>
                      Renouveler
                    </PillButton>
                  )}
                  {s.statut === "ACTIF" && (
                    <PillButton variant="ghost" size="sm" onClick={() => setStopping({ sub: s, action: "arreter" })}>
                      Arrêter
                    </PillButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Panel>

      <Panel>
        <PanelHeader title="Catalogue des offres" sub="Ce que les marques peuvent prendre en plus de la commission. Une offre inactive n'est plus proposée ; les abonnements en cours continuent." />
        {offers.error ? (
          <LoadError what="les offres" message={offers.errorMessage} />
        ) : (offers.data ?? []).length === 0 ? (
          <EmptyState>{offers.loading ? "Chargement…" : "Aucune offre."}</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 max-[900px]:grid-cols-1">
            {(offers.data ?? []).map((o) => (
              <div key={o.id} className={`rounded-2xl border border-partner-border p-4 ${o.actif ? "" : "bg-partner-bg"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <b className="block">{o.nom}</b>
                    <span className="text-[12.5px] text-partner-muted">{o.fonctionnalite ? `Débloque : ${FEATURE_LABEL[o.fonctionnalite]}` : "Sans écran dédié"}</span>
                  </div>
                  {o.actif ? <StatusPill tone="ok">Proposée</StatusPill> : <StatusPill tone="mute">Inactive</StatusPill>}
                </div>
                <p className="mb-2 mt-2 text-[13px] text-partner-muted">{o.description}</p>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="tabular-nums">
                    {o.prixMensuel > 0 ? `${formatPrice(o.prixMensuel)} / mois` : <span className="text-partner-danger">Prix à fixer</span>}
                    {o.prixAnnuel !== null && ` · ${formatPrice(o.prixAnnuel)} / an`}
                    <span className="text-partner-muted"> · {o.abonnesActifs} abonnée{o.abonnesActifs > 1 ? "s" : ""}</span>
                  </span>
                  <PillButton variant="ghost" size="sm" onClick={() => setEditing(o)}>
                    Modifier
                  </PillButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {editing && (
        <OfferDrawer
          offer={editing === "new" ? null : editing}
          getToken={offers.getToken}
          onClose={() => setEditing(null)}
          onSaved={(toast) => {
            setEditing(null);
            changed(toast);
          }}
        />
      )}
      {stopping && (
        <StopDrawer
          {...stopping}
          getToken={subs.getToken}
          onClose={() => setStopping(null)}
          onDone={(toast) => {
            setStopping(null);
            changed(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );
}

function OfferDrawer({
  offer,
  getToken,
  onClose,
  onSaved,
}: {
  offer: AdminOffer | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onSaved: (toast: string) => void;
}) {
  const [nom, setNom] = useState(offer?.nom ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [feature, setFeature] = useState<AdminOfferInput["fonctionnalite"]>(offer?.fonctionnalite ?? null);
  const [mensuel, setMensuel] = useState(offer && offer.prixMensuel > 0 ? String(offer.prixMensuel) : "");
  const [annuel, setAnnuel] = useState(offer?.prixAnnuel != null ? String(offer.prixAnnuel) : "");
  const [actif, setActif] = useState(offer?.actif ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr(null);
    const prixMensuel = Number(mensuel.replace(",", ".")) || 0;
    const prixAnnuel = annuel.trim() ? Number(annuel.replace(",", ".")) : null;
    if (nom.trim().length < 2) return setErr("Indiquez le nom de l'offre.");
    if (actif && !(prixMensuel > 0)) return setErr("Fixez un prix mensuel pour proposer l'offre.");
    if (prixAnnuel !== null && !(prixAnnuel >= 0)) return setErr("Prix annuel invalide.");
    const dto: AdminOfferInput = { nom: nom.trim(), description: description.trim(), fonctionnalite: feature, prixMensuel, prixAnnuel, actif };
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (offer) await adminApi.updateOffer(token, offer.id, dto);
      else await adminApi.createOffer(token, dto);
      onSaved(offer ? `Offre « ${dto.nom} » mise à jour.` : `Offre « ${dto.nom} » ajoutée.`);
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={offer ? `Modifier « ${offer.nom} »` : "Ajouter une offre"}
      subtitle="Les nouveaux prix s'appliquent aux prochaines demandes ; les abonnements en cours gardent leur prix."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            {offer ? "Enregistrer" : "Ajouter"}
          </PillButton>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Nom de l&apos;offre</span>
          <input type="text" maxLength={80} value={nom} onChange={(e) => setNom(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Description vue par les marques</span>
          <textarea rows={3} maxLength={400} value={description} onChange={(e) => setDescription(e.target.value)} className="partner-input resize-y" />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="partner-lbl">Ce que l&apos;offre débloque</span>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={feature === "ANALYTICS"} onClick={() => setFeature("ANALYTICS")}>
              Écran Ventes et analyses
            </Chip>
            <Chip pressed={feature === "PROMOTION"} onClick={() => setFeature("PROMOTION")}>
              Écran Mise en avant
            </Chip>
            <Chip pressed={feature === null} onClick={() => setFeature(null)}>
              Rien d&apos;automatique
            </Chip>
          </div>
          <span className="text-[12.5px] text-partner-muted">
            « Rien d&apos;automatique » : un service suivi à la main (ex. accompagnement). Sinon, l&apos;écran est bloqué sans cet abonnement.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Prix mensuel (DZD)</span>
            <input type="number" min={0} value={mensuel} onChange={(e) => setMensuel(e.target.value)} className="partner-input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Prix annuel (DZD, facultatif)</span>
            <input type="number" min={0} value={annuel} onChange={(e) => setAnnuel(e.target.value)} className="partner-input" />
          </label>
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
          Proposée aux marques
        </label>
      </div>
    </Drawer>
  );
}

function StopDrawer({
  sub,
  action,
  getToken,
  onClose,
  onDone,
}: {
  sub: AdminSubscription;
  action: "refuser" | "arreter";
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onDone: (toast: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refuse = action === "refuser";

  async function submit() {
    setErr(null);
    if (msg.trim().length < 5) return setErr("Écrivez le motif à la marque.");
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminApi.subscriptionStop(token, sub.id, action, msg.trim());
      onDone(refuse ? `Demande de ${sub.marque} refusée.` : `${sub.offre} arrêté pour ${sub.marque}.`);
    } catch (e) {
      setErr(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={refuse ? "Refuser la demande" : "Arrêter l'abonnement"}
      subtitle={`${sub.marque} : ${sub.offre}`}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={submit}>
            {refuse ? "Refuser" : "Arrêter maintenant"}
          </PillButton>
        </>
      }
    >
      {!refuse && (
        <p className="mb-3 mt-0 rounded-2xl bg-partner-warnBg px-4 py-3 text-sm text-partner-warn">
          L&apos;écran concerné est bloqué immédiatement pour la marque, même si la période payée n&apos;est pas terminée.
        </p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="partner-lbl">Motif, visible par la marque</span>
        <textarea
          rows={4}
          maxLength={500}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={refuse ? "Ex. Paiement non reçu sous 7 jours." : "Ex. Impayé du renouvellement."}
          className="partner-input resize-y"
        />
      </label>
    </Drawer>
  );
}
