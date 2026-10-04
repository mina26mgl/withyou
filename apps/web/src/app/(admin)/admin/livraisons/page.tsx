"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";
import type { AdminCarrier, AdminCarrierInput, AdminIncident, AdminIncidentType } from "@withyou/shared-types";
import { WILAYAS, formatPrice } from "@withyou/shared-utils";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, LoadError, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { adminApi, sinceLabel } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";
import { OpenTicketDrawer, TicketsPanel } from "./Tickets";

const INCIDENT_ACTION: Partial<Record<AdminIncidentType, string>> = {
  CLIENT: "Reprogrammer la livraison",
  CARRIER: "Ouvrir un ticket transporteur",
};

const fmtDays = (n: number) => `${String(n).replace(".", ",")} j`;
const zoneLabel = (w: string[]) => (w.length === 0 ? "58 wilayas" : w.length <= 3 ? w.join(", ") : `${w.length} wilayas`);

export default function AdminDeliveriesPage() {
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => adminApi.deliveries(token));
  // null = fermé, "new" = ajout, sinon le transporteur modifié.
  const [editing, setEditing] = useState<AdminCarrier | "new" | null>(null);
  const [ticketFor, setTicketFor] = useState<AdminIncident | null>(null);
  const { message, show } = useToast();
  const carriers = data?.carriers ?? [];
  const anomalies = data?.anomalies ?? [];

  return (
    <>
      <PageHeader
        title="Livraisons"
        subtitle="Comparez les transporteurs sur ce qui compte pour la cliente : le délai, la réussite de livraison et les retours."
        actions={
          <PillButton onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un service de livraison
          </PillButton>
        }
      />

      {error ? (
        <LoadError what="les livraisons" message={errorMessage} />
      ) : carriers.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-partner-bg text-partner-heading">
              <Truck className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="m-0 max-w-[46ch] text-partner-muted">
              {loading ? "Chargement…" : "Aucun service de livraison pour l'instant. Ajoutez les transporteurs avec lesquels withyou travaille."}
            </p>
            {!loading && (
              <PillButton onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ajouter un service de livraison
              </PillButton>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-3 gap-4 max-[1180px]:grid-cols-1">
          {carriers.map((c) => (
            <Panel key={c.id} className={c.actif ? undefined : "opacity-70"}>
              <div className="mb-3.5 flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <h2 className="font-partner-heading text-[22px] leading-tight text-partner-heading">{c.nom}</h2>
                  <span className="text-[12.5px] text-partner-muted">{zoneLabel(c.wilayas)}</span>
                </div>
                {c.actif ? <StatusPill tone="ok">Actif</StatusPill> : <StatusPill tone="mute">En pause</StatusPill>}
              </div>
              <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
                <dt className="text-partner-muted">Délai moyen</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">
                  {c.stats.delaiMoyenJours !== null ? fmtDays(c.stats.delaiMoyenJours) : c.delaiJours !== null ? `${fmtDays(c.delaiJours)} annoncé` : "—"}
                </dd>
                <dt className="text-partner-muted">Coût par colis</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">{formatPrice(c.coutColis)}</dd>
                <dt className="text-partner-muted">Colis en cours</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">{c.stats.enCours}</dd>
                <dt className="text-partner-muted">Colis livrés</dt>
                <dd className="m-0 text-right font-semibold tabular-nums">{c.stats.livres}</dd>
                <dt className="text-partner-muted">Anomalies ouvertes</dt>
                <dd className={`m-0 text-right font-semibold tabular-nums ${c.stats.anomalies ? "text-partner-danger" : ""}`}>{c.stats.anomalies}</dd>
              </dl>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-partner-border pt-3 text-[12.5px] text-partner-muted">
                <span className="min-w-0 truncate">{[c.telephone, c.email].filter(Boolean).join(" · ") || "Pas de contact"}</span>
                <PillButton variant="ghost" size="sm" onClick={() => setEditing(c)}>
                  Modifier
                </PillButton>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Panel>
        <PanelHeader title="Anomalies à traiter" sub="Tous transporteurs confondus, les plus anciennes en premier." />
        {anomalies.length === 0 ? (
          <EmptyState>{loading ? "Chargement…" : "Aucune anomalie en cours."}</EmptyState>
        ) : (
          <div className="-mx-1.5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[12.5px] text-partner-muted">
                  {["Colis", "Transporteur", "Wilaya", "Problème", "Depuis", ""].map((h, i) => (
                    <th key={h || i} className="whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-partner-border last:border-b-0">
                    <td className="px-3 py-3">
                      <b>{a.orderCode}</b>
                    </td>
                    <td className="px-3 py-3">{a.carrier ?? "—"}</td>
                    <td className="px-3 py-3">{a.wilaya}</td>
                    <td className="px-3 py-3">{a.reason}</td>
                    <td className="whitespace-nowrap px-3 py-3">{sinceLabel(a.openedAt).replace("il y a ", "")}</td>
                    <td className="px-3 py-3 text-right">
                      {a.ticketId ? (
                        <a
                          href="#suivi-tickets"
                          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-partner-border bg-partner-soft px-3 py-1.5 text-[13px] font-semibold text-partner-heading"
                        >
                          Ticket ouvert
                        </a>
                      ) : a.carrier ? (
                        <PillButton variant="ghost" size="sm" onClick={() => setTicketFor(a)}>
                          {INCIDENT_ACTION[a.type] ?? "Ouvrir un ticket transporteur"}
                        </PillButton>
                      ) : (
                        <Link
                          href={`/admin/commandes#${a.orderId}`}
                          className="inline-flex min-h-9 items-center whitespace-nowrap rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold hover:border-partner-muted"
                        >
                          Ouvrir la commande
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div id="suivi-tickets" className="scroll-mt-4">
        <TicketsPanel
          tickets={data?.tickets ?? []}
          loading={loading}
          getToken={getToken}
          onChanged={(toast) => {
            void reload();
            show(toast);
          }}
        />
      </div>

      {ticketFor && (
        <OpenTicketDrawer
          anomaly={ticketFor}
          getToken={getToken}
          onClose={() => setTicketFor(null)}
          onDone={(toast) => {
            setTicketFor(null);
            void reload();
            show(toast);
          }}
        />
      )}

      {editing && (
        <CarrierDrawer
          carrier={editing === "new" ? null : editing}
          getToken={getToken}
          onClose={() => setEditing(null)}
          onSaved={(toast) => {
            setEditing(null);
            void reload();
            show(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );
}

function CarrierDrawer({
  carrier,
  getToken,
  onClose,
  onSaved,
}: {
  carrier: AdminCarrier | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onSaved: (toast: string) => void;
}) {
  const [nom, setNom] = useState(carrier?.nom ?? "");
  const [everywhere, setEverywhere] = useState(!carrier || carrier.wilayas.length === 0);
  const [wilayas, setWilayas] = useState<string[]>(carrier?.wilayas ?? []);
  const [cout, setCout] = useState(carrier ? String(carrier.coutColis) : "");
  const [delai, setDelai] = useState(carrier?.delaiJours != null ? String(carrier.delaiJours) : "");
  const [telephone, setTelephone] = useState(carrier?.telephone ?? "");
  const [email, setEmail] = useState(carrier?.email ?? "");
  const [actif, setActif] = useState(carrier?.actif ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleWilaya = (w: string) => setWilayas((cur) => (cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]));

  async function save() {
    setErr(null);
    const coutColis = Number(cout.replace(",", "."));
    const delaiJours = delai.trim() ? Number(delai.replace(",", ".")) : null;
    if (nom.trim().length < 2) return setErr("Indiquez le nom du service de livraison.");
    if (!everywhere && wilayas.length === 0) return setErr("Choisissez au moins une wilaya desservie.");
    if (!(coutColis >= 0) || cout.trim() === "") return setErr("Indiquez le coût moyen par colis.");
    if (delaiJours !== null && !(delaiJours >= 0)) return setErr("Le délai doit être un nombre de jours.");

    const dto: AdminCarrierInput = {
      nom: nom.trim(),
      wilayas: everywhere ? [] : wilayas,
      coutColis,
      delaiJours,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      actif,
    };
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (carrier) {
        await adminApi.updateCarrier(token, carrier.id, dto);
        onSaved(`${dto.nom} est mis à jour.`);
      } else {
        await adminApi.createCarrier(token, dto);
        onSaved(`${dto.nom} est ajouté aux services de livraison.`);
      }
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
      title={carrier ? `Modifier ${carrier.nom}` : "Ajouter un service de livraison"}
      subtitle="Transporteur national, coursier local : les colis de withyou lui seront confiés."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            {carrier ? "Enregistrer" : "Ajouter"}
          </PillButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        <Field label="Nom du service" htmlFor="cnom">
          <input id="cnom" type="text" maxLength={80} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Yalidine" className="partner-input" />
        </Field>
        <Field label="Coût moyen par colis (DZD)" htmlFor="ccout">
          <input id="ccout" type="number" min={0} inputMode="numeric" value={cout} onChange={(e) => setCout(e.target.value)} placeholder="Ex. 650" className="partner-input" />
        </Field>
        <Field label="Délai annoncé (jours)" htmlFor="cdelai" hint="Facultatif. Le délai réel est calculé à partir des livraisons.">
          <input id="cdelai" type="number" min={0} step={0.5} value={delai} onChange={(e) => setDelai(e.target.value)} placeholder="Ex. 2" className="partner-input" />
        </Field>
        <Field label="État" htmlFor="cactif">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input id="cactif" type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
            Actif : peut recevoir de nouveaux colis
          </label>
        </Field>
        <Field label="Téléphone" htmlFor="ctel">
          <input id="ctel" type="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex. 023 00 00 00" className="partner-input" />
        </Field>
        <Field label="E-mail" htmlFor="cmail">
          <input id="cmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ex. pro@transporteur.dz" className="partner-input" />
        </Field>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <span className="partner-lbl">Zone desservie</span>
        <div className="flex flex-wrap gap-2">
          <Chip pressed={everywhere} onClick={() => setEverywhere(true)}>
            Les 58 wilayas
          </Chip>
          <Chip pressed={!everywhere} onClick={() => setEverywhere(false)}>
            Certaines wilayas
          </Chip>
        </div>
        {!everywhere && (
          <>
            <span className="text-[12.5px] text-partner-muted">
              {wilayas.length ? `${wilayas.length} wilaya${wilayas.length > 1 ? "s" : ""} sélectionnée${wilayas.length > 1 ? "s" : ""}` : "Touchez les wilayas desservies."}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WILAYAS.map((w) => (
                <Chip key={w} pressed={wilayas.includes(w)} onClick={() => toggleWilaya(w)} className="min-h-9 px-2.5 py-1 text-[12.5px]">
                  {w}
                </Chip>
              ))}
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="partner-lbl">
        {label}
      </label>
      {children}
      {hint && <span className="text-[12.5px] text-partner-muted">{hint}</span>}
    </div>
  );
}
