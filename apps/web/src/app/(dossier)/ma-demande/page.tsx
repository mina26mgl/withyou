"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, Check, Clock, FileText, LogOut, Send, Upload, X } from "lucide-react";
import type { BrandChecklistItem, BrandDocumentType, BrandRequestDocument, BrandRequestState } from "@withyou/shared-types";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton, PillLink } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { LoadError, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { apiErrorMessage, brandRequestApi } from "@/lib/partnerApi";
import { formatFileSize } from "@/lib/productDocuments";
import { usePartnerData } from "@/lib/usePartnerData";

const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_BYTES = 15 * 1024 * 1024;

const SLOTS: { type: BrandDocumentType; title: string; hint: string }[] = [
  { type: "REGISTRE_COMMERCE", title: "Registre du commerce", hint: "Si votre marque est une entreprise (SARL, EURL, commerçant…)." },
  { type: "CARTE_ARTISAN", title: "Carte d'artisan", hint: "Si vous fabriquez en tant qu'artisan (Chambre de l'artisanat et des métiers)." },
  { type: "CATALOGUE", title: "Catalogue de tous vos produits", hint: "Noms, photos, contenances et prix. PDF, Excel ou Word." },
  { type: "AUTRE", title: "Autres documents (facultatif)", hint: "Certificats, analyses, labels bio ou halal…" },
];

export default function MaDemandePage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { data, error, errorMessage, getToken } = usePartnerData((token) => brandRequestApi.get(token));
  const [state, setState] = useState<BrandRequestState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { message, show } = useToast();

  useEffect(() => {
    if (data) setState(data);
  }, [data]);

  // Marque acceptée : son espace est ouvert.
  useEffect(() => {
    if (state?.status === "APPROVED") router.replace("/accueil");
  }, [state?.status, router]);

  async function run(key: string, fn: (token: string) => Promise<BrandRequestState>, toast?: string) {
    const token = await getToken();
    if (!token) return;
    setBusy(key);
    try {
      setState(await fn(token));
      if (toast) show(toast);
    } catch (e) {
      show(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusy(null);
    }
  }

  const header = (
    <PageHeader
      title={state ? `Bienvenue, ${state.nomMarque}` : "Votre demande"}
      subtitle="Avant d'ouvrir votre espace marque, l'équipe withyou vérifie chaque marque. Déposez votre dossier et suivez ici chaque étape."
      actions={
        <PillButton variant="ghost" onClick={() => signOut({ redirectUrl: "/login" })}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Se déconnecter
        </PillButton>
      }
    />
  );

  if (error) return <>{header}<LoadError what="votre demande" message={errorMessage} /></>;
  if (!state) return <>{header}<p className="py-10 text-center text-partner-muted">Chargement…</p></>;

  const inReview = state.status === "PENDING" && !!state.submittedAt;
  const editable = !inReview && state.status !== "APPROVED";
  const done = state.checklist.filter((c) => c.done).length;

  return (
    <>
      {header}

      {state.status === "REJECTED" && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-partner-warnBg px-4 py-3.5 text-sm text-partner-warn">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
          <div>
            <b className="block">L&apos;équipe withyou demande des compléments</b>
            {state.rejectionMessage && <span className="whitespace-pre-line text-partner-ink">{state.rejectionMessage}</span>}
            <span className="mt-1 block text-[12.5px]">Corrigez votre dossier ci-dessous puis renvoyez-le.</span>
          </div>
        </div>
      )}
      {inReview && (
        <div className="flex gap-3 rounded-2xl bg-partner-soft px-4 py-3.5 text-sm">
          <Clock className="mt-0.5 h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
          <div>
            <b className="block text-partner-heading">Dossier en cours d&apos;examen</b>
            Envoyé le {new Date(state.submittedAt!).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. L&apos;équipe withyou vous
            répond sous 48 h ouvrées et coche ici chaque vérification au fur et à mesure.
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-[18px] max-[1000px]:grid-cols-1">
        <Panel>
          <PanelHeader title="Checklist de validation" sub={`${done} étape${done > 1 ? "s" : ""} sur ${state.checklist.length}`} />
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-partner-leafBg">
            <div className="h-full rounded-full bg-partner-leaf" style={{ width: `${(done / state.checklist.length) * 100}%` }} />
          </div>
          <Checklist title="Vos étapes" items={state.checklist.filter((c) => c.by === "BRAND")} />
          <Checklist title="Vérifications par withyou" items={state.checklist.filter((c) => c.by === "WITHYOU")} />
        </Panel>

        <Panel>
          <PanelHeader
            title="Votre dossier"
            sub="Registre du commerce ou carte d'artisan (l'un des deux suffit) et catalogue de vos produits : obligatoires."
          />
          <div className="flex flex-col gap-3">
            {SLOTS.map((slot) => (
              <DocumentSlot
                key={slot.type}
                slot={slot}
                documents={state.documents.filter((d) => d.type === slot.type)}
                editable={editable}
                busy={busy}
                onError={show}
                onUpload={(file) => run(`up-${slot.type}`, (tk) => brandRequestApi.upload(tk, file, slot.type), `« ${file.name} » ajouté.`)}
                onRemove={(doc) => run(doc.id, (tk) => brandRequestApi.remove(tk, doc.id))}
              />
            ))}
          </div>
          {editable && (
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
              {!state.canSubmit && (
                <span className="mr-auto text-[12.5px] text-partner-muted">
                  Il manque {state.checklist.find((c) => c.key === "LEGAL")?.done ? "le catalogue" : "le registre du commerce ou la carte d'artisan"}.
                </span>
              )}
              <PillButton
                disabled={!state.canSubmit || busy !== null}
                onClick={() =>
                  run("submit", (tk) => brandRequestApi.submit(tk), "Dossier envoyé. L'équipe withyou vous répond sous 48 h ouvrées.")
                }
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {state.status === "REJECTED" ? "Renvoyer mon dossier" : "Envoyer mon dossier"}
              </PillButton>
            </div>
          )}
        </Panel>
      </div>

      <p className="text-center text-[12.5px] text-partner-muted">
        Vos documents ne sont vus que par l&apos;équipe withyou. En attendant,{" "}
        <PillLink href="/home" variant="link" size="sm">
          découvrez l&apos;app withyou
        </PillLink>
      </p>
      <Toast message={message} />
    </>
  );
}

function Checklist({ title, items }: { title: string; items: BrandChecklistItem[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-partner-muted">{title}</h3>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 text-sm">
            <span
              className={`mt-px grid h-[22px] w-[22px] flex-none place-items-center rounded-full ${item.done ? "bg-partner-leaf text-white" : "border-[1.5px] border-partner-border bg-white"}`}
              aria-hidden="true"
            >
              {item.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0">
              <span className={item.done ? "font-semibold text-partner-ink" : "text-partner-ink"}>{item.label}</span>
              <span className="sr-only">{item.done ? " : fait" : " : à faire"}</span>
              {!item.done && item.hint && <span className="block text-[12.5px] text-partner-muted">{item.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DocumentSlot({
  slot,
  documents,
  editable,
  busy,
  onUpload,
  onRemove,
  onError,
}: {
  slot: (typeof SLOTS)[number];
  documents: BrandRequestDocument[];
  editable: boolean;
  busy: string | null;
  onUpload: (file: File) => void;
  onRemove: (doc: BrandRequestDocument) => void;
  onError: (msg: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const uploading = busy === `up-${slot.type}`;
  return (
    <div className="rounded-2xl border border-partner-border bg-white p-3.5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <b className="flex items-center gap-2 text-sm">
            {slot.title}
            {documents.length > 0 && <StatusPill tone="ok">Ajouté</StatusPill>}
          </b>
          <span className="text-[12.5px] text-partner-muted">{slot.hint}</span>
        </div>
        {editable && (
          <PillButton variant="ghost" size="sm" disabled={busy !== null} onClick={() => input.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {uploading ? "Envoi…" : documents.length ? "Ajouter un autre" : "Ajouter"}
          </PillButton>
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          aria-label={slot.title}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > MAX_BYTES) return onError(`« ${file.name} » est trop lourd (15 Mo maximum).`);
            onUpload(file);
          }}
        />
      </div>
      {documents.length > 0 && (
        <ul className="m-0 mt-2.5 flex list-none flex-col gap-1.5 p-0">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 rounded-xl bg-partner-bg px-3 py-2">
              <FileText className="h-4 w-4 flex-none text-partner-heading" aria-hidden="true" />
              <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                {d.nom}
              </a>
              <span className="flex-none text-[12px] text-partner-muted">{formatFileSize(d.taille)}</span>
              {editable && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onRemove(d)}
                  aria-label={`Retirer ${d.nom}`}
                  className="grid h-7 w-7 flex-none place-items-center rounded-full text-partner-muted hover:bg-white hover:text-partner-danger"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
