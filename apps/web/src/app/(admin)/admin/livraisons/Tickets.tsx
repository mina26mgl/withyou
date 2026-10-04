"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import type { AdminIncident, AdminTicket } from "@withyou/shared-types";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { EmptyState, Panel, PanelHeader, Tabs } from "@/components/partner/ui-blocks";
import { adminTicketsApi, sinceLabel, TICKET_MOTIFS } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";

type GetToken = () => Promise<string | null>;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

/** Lien mailto : ouvre la messagerie avec le message du ticket (aucun serveur d'envoi requis). */
function mailto(t: Pick<AdminTicket, "transporteurEmail" | "orderCode" | "codeSuivi" | "motif" | "message">, relance = false) {
  const subject = `${relance ? "Relance – " : ""}Réclamation withyou – ${t.motif} – colis ${t.codeSuivi ?? t.orderCode}`;
  const body = `${relance ? "Bonjour,\n\nNous revenons vers vous au sujet de la réclamation ci-dessous, restée sans réponse.\n\n" : "Bonjour,\n\n"}${t.message}\n\nCommande withyou : ${t.orderCode}\nN° de suivi : ${t.codeSuivi ?? "—"}\n\nMerci,\nL'équipe withyou`;
  return `mailto:${t.transporteurEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function statusPill(t: AdminTicket) {
  if (t.statut === "RESOLU") return <StatusPill tone="ok">Résolu</StatusPill>;
  if (t.statut === "REPONDU") return <StatusPill tone="info">Répondu</StatusPill>;
  if (t.aRelancer) return <StatusPill tone="danger">À relancer</StatusPill>;
  return <StatusPill tone="warn">En attente de réponse</StatusPill>;
}

/* ------------------------------------------------------------------ */
/* Ouvrir un ticket                                                    */
/* ------------------------------------------------------------------ */

export function OpenTicketDrawer({
  anomaly,
  getToken,
  onClose,
  onDone,
}: {
  anomaly: AdminIncident;
  getToken: GetToken;
  onClose: () => void;
  onDone: (toast: string) => void;
}) {
  const client = anomaly.type === "CLIENT";
  const [motif, setMotif] = useState<string>(client ? "Nouvelle tentative de livraison" : "Colis immobile");
  const [message, setMessage] = useState(
    client
      ? `La cliente n'a pas pu être jointe (${anomaly.reason.toLowerCase()}). Merci de programmer une nouvelle tentative de livraison et de nous confirmer la date.`
      : `${anomaly.reason}. Merci de vérifier la situation du colis et de nous indiquer quand il repartira.`,
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    if (message.trim().length < 5) return setErr("Écrivez le message au transporteur.");
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminTicketsApi.open(token, { orderId: anomaly.orderId, motif, message: message.trim() });
      onDone(`Ticket ouvert chez ${anomaly.carrier ?? "le transporteur"}. Réponse attendue sous 24 h.`);
    } catch (e) {
      setErr(apiErrorMessage(e, "Impossible d'ouvrir le ticket."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={client ? "Reprogrammer la livraison" : "Ouvrir un ticket transporteur"}
      subtitle={`${anomaly.orderCode}, ${anomaly.carrier ?? "transporteur inconnu"}, ${anomaly.wilaya}`}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={submit}>
            Ouvrir le ticket
          </PillButton>
        </>
      }
    >
      <div role="alert" className="mb-4 rounded-2xl bg-partner-dangerBg px-4 py-3 text-sm text-partner-danger">
        <b className="block">Anomalie</b>
        {anomaly.reason}
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        <span className="partner-lbl">Motif</span>
        <div className="flex flex-wrap gap-2">
          {TICKET_MOTIFS.map((m) => (
            <Chip key={m} pressed={motif === m} onClick={() => setMotif(m)}>
              {m}
            </Chip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tmsg" className="partner-lbl">
          Message au transporteur
        </label>
        <textarea id="tmsg" rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} className="partner-input resize-y" />
        <span className="text-[12.5px] text-partner-muted">
          Après l&apos;ouverture, « E-mail » dans le suivi des tickets prépare ce message pour le contact du transporteur.
        </span>
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Suivi des tickets                                                   */
/* ------------------------------------------------------------------ */

export function TicketsPanel({
  tickets,
  loading,
  getToken,
  onChanged,
}: {
  tickets: AdminTicket[];
  loading: boolean;
  getToken: GetToken;
  onChanged: (toast: string) => void;
}) {
  const [tab, setTab] = useState<"open" | "done">("open");
  const [replying, setReplying] = useState<AdminTicket | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const open = tickets.filter((t) => t.statut !== "RESOLU");
  const done = tickets.filter((t) => t.statut === "RESOLU");
  const list = tab === "open" ? open : done;

  async function act(t: AdminTicket, kind: "relance" | "resolve") {
    const token = await getToken();
    if (!token) return;
    setBusyId(t.id);
    try {
      if (kind === "relance") {
        await adminTicketsApi.relance(token, t.id);
        onChanged(`Relance enregistrée pour ${t.orderCode}.`);
      } else {
        await adminTicketsApi.resolve(token, t.id);
        onChanged(`Ticket ${t.orderCode} résolu : la commande n'est plus en anomalie.`);
      }
    } catch (e) {
      onChanged(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Suivi des tickets"
        sub="Réclamations envoyées aux transporteurs : qui les a ouvertes, et s'ils ont répondu. Sans réponse sous 24 h, relancez."
        aside={
          <Tabs<"open" | "done">
            label="Filtrer les tickets"
            value={tab}
            onChange={setTab}
            items={[
              { key: "open", label: "En cours", count: open.length },
              { key: "done", label: "Résolus", count: done.length },
            ]}
          />
        }
      />
      {list.length === 0 ? (
        <EmptyState>
          {loading ? "Chargement…" : tab === "open" ? "Aucun ticket en cours. Ouvrez-en un depuis une anomalie ci-dessus." : "Aucun ticket résolu pour l'instant."}
        </EmptyState>
      ) : (
        <div className="flex flex-col">
          {list.map((t) => (
            <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-partner-border py-4 last:border-b-0 max-[800px]:grid-cols-1">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/commandes#${t.orderId}`} className="font-bold text-partner-heading underline-offset-2 hover:underline">
                    {t.orderCode}
                  </Link>
                  <span className="text-sm text-partner-muted">
                    {t.transporteur}
                    {t.codeSuivi ? `, suivi ${t.codeSuivi}` : ""}
                  </span>
                  {statusPill(t)}
                </div>
                <div className="mt-1 text-sm">
                  <b>{t.motif}</b> — <span className="text-partner-muted">{t.message}</span>
                </div>
                <div className="mt-1.5 text-[12.5px] text-partner-muted">
                  Ouvert le {fmtDate(t.openedAt)} par {t.openedBy || "—"}
                  {t.relances > 0 && ` · ${t.relances} relance${t.relances > 1 ? "s" : ""}, la dernière ${sinceLabel(t.derniereRelanceAt)}`}
                  {t.statut === "OUVERT" && !t.relances && ` · sans réponse depuis ${sinceLabel(t.openedAt).replace("il y a ", "")}`}
                  {t.resolvedAt && ` · résolu le ${fmtDate(t.resolvedAt)} par ${t.resolvedBy}`}
                </div>
                {t.reponse && (
                  <div className="mt-2 rounded-r-xl border-l-[3px] border-partner-leaf bg-partner-bg px-3.5 py-2.5 text-sm">
                    <b className="mb-0.5 block text-[12.5px] text-partner-heading">Réponse du transporteur, {fmtDate(t.reponseAt)}</b>
                    {t.reponse}
                  </div>
                )}
              </div>
              {t.statut !== "RESOLU" && (
                <div className="flex flex-wrap items-start justify-end gap-2">
                  {t.transporteurEmail && (
                    <a
                      href={mailto(t, t.relances > 0 || t.aRelancer)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-partner-border bg-partner-card px-3 py-1.5 text-[13px] font-semibold hover:border-partner-muted"
                      title={`Écrire à ${t.transporteurEmail}`}
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      E-mail
                    </a>
                  )}
                  {t.statut === "OUVERT" && (
                    <PillButton variant={t.aRelancer ? "primary" : "ghost"} size="sm" disabled={busyId === t.id} onClick={() => act(t, "relance")}>
                      Relancer
                    </PillButton>
                  )}
                  <PillButton variant="ghost" size="sm" onClick={() => setReplying(t)}>
                    {t.reponse ? "Modifier la réponse" : "Noter la réponse"}
                  </PillButton>
                  <PillButton variant="ghost" size="sm" disabled={busyId === t.id} onClick={() => act(t, "resolve")}>
                    Résolu
                  </PillButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {replying && (
        <ReplyDrawer
          ticket={replying}
          getToken={getToken}
          onClose={() => setReplying(null)}
          onDone={(toast) => {
            setReplying(null);
            onChanged(toast);
          }}
        />
      )}
    </Panel>
  );
}

function ReplyDrawer({
  ticket,
  getToken,
  onClose,
  onDone,
}: {
  ticket: AdminTicket;
  getToken: GetToken;
  onClose: () => void;
  onDone: (toast: string) => void;
}) {
  const [reponse, setReponse] = useState(ticket.reponse ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr(null);
    if (reponse.trim().length < 2) return setErr("Notez la réponse du transporteur.");
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminTicketsApi.reply(token, ticket.id, reponse.trim());
      onDone(`Réponse de ${ticket.transporteur} enregistrée.`);
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
      title="Réponse du transporteur"
      subtitle={`${ticket.orderCode}, ${ticket.transporteur} : ${ticket.motif}`}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            Enregistrer la réponse
          </PillButton>
        </>
      }
    >
      <p className="mb-3 mt-0 text-sm text-partner-muted">{ticket.message}</p>
      <label htmlFor="trep" className="partner-lbl">
        Ce que le transporteur a répondu
      </label>
      <textarea
        id="trep"
        rows={5}
        maxLength={2000}
        value={reponse}
        onChange={(e) => setReponse(e.target.value)}
        placeholder="Ex. Colis relancé, livraison prévue demain."
        className="partner-input mt-1.5 resize-y"
      />
      <p className="mt-2 text-[12.5px] text-partner-muted">
        Une fois le colis reparti ou livré, cliquez sur « Résolu » : la commande sortira des anomalies.
      </p>
    </Drawer>
  );
}
