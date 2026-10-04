"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminPageReview, AdminProductReview, AdminValidationItem } from "@withyou/shared-types";
import { useAdmin } from "@/components/admin/AdminContext";
import { BrandAvatar } from "@/components/admin/BrandAvatar";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PhonePreview } from "@/components/partner/PhonePreview";
import { PillButton } from "@/components/partner/PillButton";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, KpiGrid, LoadError, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { BrandPagePreview } from "@/app/(partner)/page-marque/BrandPagePreview";
import { adminApi, sinceLabel } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";
import { FileText } from "lucide-react";
import { DOCUMENT_LABEL, formatFileSize } from "@/lib/productDocuments";
import { formatDzPhone } from "@withyou/shared-utils";

/** Points de la Charte Beauté Pure, repris du prototype. `auto` : contrôlé par la plateforme. */
const PAGE_CHECKS = [
  { label: "Contraste lisible (texte 4,5:1, titres 3:1)", auto: true },
  { label: "Histoire rédigée par la marque, sans promesse médicale" },
  { label: "Chaque engagement est justifié par un document" },
  { label: "Couverture et logo de bonne qualité" },
];
const PRODUCT_CHECKS = [
  { label: "Liste INCI complète et lisible", auto: true },
  { label: "Aucun ingrédient de la liste d'exclusion Beauté Pure", auto: true },
  { label: "Types de peau et besoins renseignés", auto: true },
  { label: "Photos réelles, fond clair, produit centré" },
  { label: "Prix cohérent avec la catégorie" },
];
/** Mêmes clés que l'API (brand-checklist.ts) : la marque voit ces points cochés dans son dossier. */
const BRAND_CHECKS = [
  { key: "DOCUMENTS", label: "Registre de commerce ou carte d'artisan vérifié, catalogue reçu" },
  { key: "VISITE", label: "Visite ou appel vidéo de l'atelier réalisé" },
  { key: "CHARTE", label: "Produits conformes à la Charte Beauté Pure" },
  { key: "CONTRAT", label: "Contrat de commission signé" },
];
const BRAND_DOC_LABEL: Record<string, string> = {
  REGISTRE_COMMERCE: "Registre du commerce",
  CARTE_ARTISAN: "Carte d'artisan",
  CATALOGUE: "Catalogue des produits",
  AUTRE: "Autre document",
};

/**
 * Message envoyé à la marque : les points non cochés (« Points à corriger »),
 * suivis de la note de l'admin. Vide si tout est coché et qu'il n'y a pas de note.
 */
function correctionMessage(checks: { label: string }[], checked: boolean[], note: string): string {
  const missing = checks.filter((_, i) => !checked[i]).map((c) => `- ${c.label}`);
  const list = missing.length ? `Points à corriger :\n${missing.join("\n")}` : "";
  return [list, note.trim()].filter(Boolean).join("\n\n");
}

const keyOf = (v: AdminValidationItem) => `${v.kind}-${v.id}`;
export default function AdminValidationsPage() {
  const { refresh } = useAdmin();
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => adminApi.validations(token));
  const [open, setOpen] = useState<AdminValidationItem | null>(null);
  const { message, show } = useToast();
  const queue = data ?? [];

  // Lien « Examiner » depuis la vue du jour : /admin/validations#page-<id>
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !data) return;
    const found = data.find((v) => keyOf(v) === hash);
    if (found) setOpen(found);
    history.replaceState(null, "", window.location.pathname);
  }, [data]);

  const done = useCallback(
    (toast: string) => {
      setOpen(null);
      void reload();
      refresh();
      show(toast);
    },
    [reload, refresh, show],
  );

  return (
    <>
      <PageHeader
        title="Validations"
        subtitle="Nouvelles marques, produits et pages modifiées : tout passe par la Charte Beauté Pure avant d'être visible par les clientes."
      />
      <KpiGrid
        items={[
          { label: "En attente", value: String(queue.length) },
          { label: "Pages marque", value: String(queue.filter((v) => v.kind === "page").length) },
          { label: "Produits", value: String(queue.filter((v) => v.kind === "product").length) },
          { label: "Nouvelles marques", value: String(queue.filter((v) => v.kind === "brand").length) },
        ]}
      />
      <Panel>
        <PanelHeader
          title="File d'attente"
          sub="Les points marqués « Vérifié automatiquement » sont contrôlés par la plateforme. Les autres demandent votre regard."
        />
        {error ? (
          <LoadError what="la file de validations" message={errorMessage} />
        ) : queue.length === 0 ? (
          <EmptyState>{loading ? "Chargement…" : "La file est vide. Tout est à jour."}</EmptyState>
        ) : (
          queue.map((v) => (
            <div key={keyOf(v)} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 border-b border-partner-border py-3.5 last:border-b-0">
              <BrandAvatar name={v.brand} logoUrl={v.logoUrl} />
              <div className="min-w-0">
                <b className="block leading-tight">
                  {v.brand} : {v.title}
                </b>
                <span className="text-[12.5px] text-partner-muted">
                  {v.kind === "page" ? "Page marque" : v.kind === "product" ? "Nouveau produit" : `Inscription de ${v.email}`}, reçu{" "}
                  {sinceLabel(v.since)}
                </span>
              </div>
              <PillButton variant="ghost" size="sm" onClick={() => setOpen(v)}>
                Examiner
              </PillButton>
            </div>
          ))
        )}
      </Panel>

      {open?.kind === "page" && (
        <PageReviewDrawer item={open} getToken={getToken} onClose={() => setOpen(null)} onDone={done} />
      )}
      {open?.kind === "product" && (
        <ProductReviewDrawer item={open} getToken={getToken} onClose={() => setOpen(null)} onDone={done} />
      )}
      {open?.kind === "brand" && (
        <BrandRequestDrawer item={open} getToken={getToken} onClose={() => setOpen(null)} onDone={done} />
      )}
      <Toast message={message} />
    </>
  );
}

type DrawerProps = {
  item: AdminValidationItem;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onDone: (toast: string) => void;
};

function Checklist({
  checks,
  checked,
  onToggle,
}: {
  checks: { label: string; auto?: boolean }[];
  checked: boolean[];
  onToggle: (i: number) => void;
}) {
  return (
    <>
      <p className="mb-3.5 mt-0 text-[12.5px] text-partner-muted">
        Cochez chaque point respecté. « Valider et publier » n&apos;est possible que lorsque tout est coché. Si un point
        n&apos;est pas respecté, laissez-le décoché et cliquez sur « Demander des corrections » : il sera envoyé à la marque.
      </p>
      {checks.map((c, i) => (
        <label key={c.label} className="mb-2 flex cursor-pointer items-start gap-3 rounded-[14px] border border-partner-border bg-partner-card px-3.5 py-3 hover:border-partner-muted">
          <input
            type="checkbox"
            checked={checked[i]}
            disabled={c.auto}
            onChange={() => onToggle(i)}
            className="mt-0.5 h-[18px] w-[18px] flex-none accent-[#3A9A5E]"
          />
          <span className="flex-1 text-sm">{c.label}</span>
          {c.auto && (
            <span className="whitespace-nowrap rounded-full bg-partner-infoBg px-2 py-px text-[11.5px] font-semibold text-partner-info">
              Vérifié automatiquement
            </span>
          )}
        </label>
      ))}
    </>
  );
}

function MessageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      <label htmlFor="vnote" className="partner-lbl">
        Message à la marque
      </label>
      <textarea
        id="vnote"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Précisez si besoin (ex. la photo principale est floue). Ce message apparaît dans son espace marque."
        className="partner-input resize-y"
      />
      <span className="text-[12.5px] text-partner-muted">
        Facultatif si un point est décoché : la liste des points à corriger est ajoutée automatiquement.
      </span>
    </div>
  );
}

function PageReviewDrawer({ item, getToken, onClose, onDone }: DrawerProps) {
  const [review, setReview] = useState<AdminPageReview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checked, setChecked] = useState(PAGE_CHECKS.map(() => false));
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const r = await adminApi.pageReview(token, item.id);
        setReview(r);
        setChecked(PAGE_CHECKS.map((c) => (c.auto ? r.contrast.ok : false)));
      } catch (e) {
        setLoadError(apiErrorMessage(e, "Impossible de charger la page."));
      }
    })();
  }, [getToken, item.id]);

  async function act(kind: "approve" | "reject") {
    setErr(null);
    const message = correctionMessage(PAGE_CHECKS, checked, note);
    if (kind === "reject" && message.length < 5) {
      setErr("Tout est coché : écrivez à la marque ce qu'elle doit corriger.");
      document.getElementById("vnote")?.focus();
      return;
    }
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (kind === "approve") {
        const { slug } = await adminApi.approvePage(token, item.id);
        onDone(`Validé et publié : la page de ${item.brand} est en ligne (/marque/${slug}).`);
      } else {
        await adminApi.rejectPage(token, item.id, message);
        onDone(`Corrections demandées à ${item.brand}.`);
      }
    } catch (e) {
      setErr(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusy(false);
    }
  }

  const all = checked.every(Boolean);
  return (
    <Drawer
      open
      onClose={onClose}
      title="Page marque modifiée"
      subtitle={`${item.brand} : couleurs, histoire, visages et engagements`}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" disabled={busy} onClick={() => act("reject")}>
            Demander des corrections
          </PillButton>
          <PillButton disabled={!all || busy || !review} onClick={() => act("approve")}>
            Valider et publier
          </PillButton>
        </>
      }
    >
      {loadError ? (
        <LoadError what="la page" message={loadError} />
      ) : !review ? (
        <p className="text-partner-muted">Chargement de la page…</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 max-[900px]:grid-cols-1">
          <div>
            <Checklist checks={PAGE_CHECKS} checked={checked} onToggle={(i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} />
            {!review.contrast.ok && (
              <p className="mt-1 text-[12.5px] font-semibold text-partner-danger">
                Contraste insuffisant (texte {review.contrast.textRatio.toFixed(1)}:1, titres {review.contrast.accentRatio.toFixed(1)}:1) : demandez des corrections.
              </p>
            )}
            <div className="mt-3 rounded-2xl bg-partner-soft px-4 py-3 text-[13px]">
              {review.firstPublication
                ? `Première mise en ligne : la page sera publiée à l'adresse /marque/… tirée du nom « ${review.draft.name} ».`
                : `Mise à jour d'une page déjà en ligne (/marque/${review.slug}).`}
            </div>
            <MessageField value={note} onChange={setNote} />
          </div>
          <div style={{ zoom: 0.72 }}>
            <PhonePreview screenColor={review.draft.bgColor}>
              <BrandPagePreview slug={review.slug} content={review.draft} candidates={review.candidates} />
            </PhonePreview>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function BrandRequestDrawer({ item, getToken, onClose, onDone }: DrawerProps) {
  // Cochés au fil des vérifications et enregistrés : la marque suit l'avancement dans son dossier.
  const [checked, setChecked] = useState(BRAND_CHECKS.map((c) => (item.checks ?? []).includes(c.key)));

  async function toggle(i: number) {
    const next = checked.map((v, j) => (j === i ? !v : v));
    setChecked(next);
    const token = await getToken();
    if (!token) return;
    try {
      await adminApi.brandChecks(token, item.id, BRAND_CHECKS.filter((_, j) => next[j]).map((c) => c.key));
    } catch (e) {
      setChecked(checked);
      setErr(apiErrorMessage(e, "La checklist n'a pas pu être enregistrée."));
    }
  }
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(kind: "approve" | "reject") {
    setErr(null);
    const message = correctionMessage(BRAND_CHECKS, checked, note);
    if (kind === "reject" && message.length < 5) {
      setErr("Tout est coché : écrivez à la marque ce qu'elle doit corriger.");
      document.getElementById("vnote")?.focus();
      return;
    }
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (kind === "approve") {
        await adminApi.approveBrand(token, item.id);
        onDone(`${item.brand} est acceptée : son espace marque est ouvert.`);
      } else {
        await adminApi.rejectBrand(token, item.id, message);
        onDone(`Demande de ${item.brand} refusée.`);
      }
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
      title="Nouvelle marque"
      subtitle={`${item.brand}, dossier envoyé ${sinceLabel(item.since)}`}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" disabled={busy} onClick={() => act("reject")}>
            Refuser la demande
          </PillButton>
          <PillButton disabled={!checked.every(Boolean) || busy} onClick={() => act("approve")}>
            Accepter la marque
          </PillButton>
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm max-[700px]:grid-cols-1">
        <div>
          <div className="text-[12.5px] text-partner-muted">Marque</div>
          {item.brand}
        </div>
        <div>
          <div className="text-[12.5px] text-partner-muted">Compte</div>
          {item.email}
        </div>
        <div className="col-span-2 max-[700px]:col-span-1">
          <div className="mb-1.5 text-[12.5px] text-partner-muted">Dossier envoyé par la marque</div>
          {(item.documents ?? []).length === 0 ? (
            <span className="text-partner-danger">Aucun document.</span>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {(item.documents ?? []).map((d) => (
                <li key={d.id}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 rounded-xl border border-partner-border bg-white px-3 py-2 hover:border-partner-heading/40"
                  >
                    <FileText className="h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{d.nom}</b>
                      <span className="text-[12px] text-partner-muted">
                        {BRAND_DOC_LABEL[d.type] ?? d.type}
                        {d.taille ? ` · ${formatFileSize(d.taille)}` : ""}
                      </span>
                    </span>
                    <span className="text-[12.5px] font-semibold text-partner-heading">Ouvrir</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-[12.5px] text-partner-muted">Contact</div>
          {item.contact ?? "—"}
        </div>
        <div>
          <div className="text-[12.5px] text-partner-muted">Téléphone</div>
          {item.telephone ? (
            <a href={`tel:${item.telephone}`} className="font-semibold text-partner-heading hover:underline">
              {formatDzPhone(item.telephone)}
            </a>
          ) : (
            "—"
          )}
        </div>
      </div>
      <Checklist checks={BRAND_CHECKS} checked={checked} onToggle={(i) => void toggle(i)} />
      <p className="mt-2 text-[12.5px] text-partner-muted">
        En acceptant, la marque est créée et rattachée à ce compte : son espace marque s&apos;ouvre et elle peut préparer sa page.
      </p>
      <MessageField value={note} onChange={setNote} />
    </Drawer>
  );
}

function ProductReviewDrawer({ item, getToken, onClose, onDone }: DrawerProps) {
  const [review, setReview] = useState<AdminProductReview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checked, setChecked] = useState(PRODUCT_CHECKS.map(() => false));
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const r = await adminApi.productReview(token, item.id);
        setReview(r);
        // Les trois premiers points sont contrôlés automatiquement.
        const auto = [r.checks.inciFilled, r.checks.excludedFound.length === 0, r.checks.targetingFilled];
        setChecked(PRODUCT_CHECKS.map((c, i) => (c.auto ? auto[i] : false)));
      } catch (e) {
        setLoadError(apiErrorMessage(e, "Impossible de charger le produit."));
      }
    })();
  }, [getToken, item.id]);

  async function act(kind: "approve" | "reject") {
    setErr(null);
    const message = correctionMessage(PRODUCT_CHECKS, checked, note);
    if (kind === "reject" && message.length < 5) {
      setErr("Tout est coché : écrivez à la marque ce qu'elle doit corriger.");
      document.getElementById("vnote")?.focus();
      return;
    }
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (kind === "approve") {
        await adminApi.approveProduct(token, item.id);
        onDone(`Validé et publié : ${item.title} est en ligne.`);
      } else {
        await adminApi.rejectProduct(token, item.id, message);
        onDone(`Corrections demandées à ${item.brand}.`);
      }
    } catch (e) {
      setErr(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusy(false);
    }
  }

  const conservation = review?.dureeConservationJours
    ? review.dureeConservationJours % 30 === 0
      ? `${review.dureeConservationJours / 30} mois après ouverture`
      : `${review.dureeConservationJours} jours après ouverture`
    : "Durée non renseignée";

  return (
    <Drawer
      open
      onClose={onClose}
      title="Nouveau produit"
      subtitle={`${item.brand} : ${item.title}`}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" disabled={busy} onClick={() => act("reject")}>
            Demander des corrections
          </PillButton>
          <PillButton disabled={!checked.every(Boolean) || busy || !review} onClick={() => act("approve")}>
            Valider et publier
          </PillButton>
        </>
      }
    >
      {loadError ? (
        <LoadError what="le produit" message={loadError} />
      ) : !review ? (
        <p className="text-partner-muted">Chargement du produit…</p>
      ) : (
        <>
          {review.images.length > 0 && (
            <div className="mb-4 grid grid-cols-5 gap-2">
              {review.images.map((url, i) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl border border-partner-border bg-partner-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-white px-[7px] py-px text-[10px] font-bold text-partner-heading">Principale</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm max-[700px]:grid-cols-1">
            <Info k="Catégorie" v={review.categorie ?? "—"} />
            <Info k="Prix" v={`${review.prix.toLocaleString("fr-FR")} DZD${review.size ? `, ${review.size}` : ""}`} />
            <Info k="Types de peau" v={review.skinTypes.join(", ") || "—"} />
            <Info k="Besoins" v={review.needs.join(", ") || "—"} />
            <Info k="Moment" v={review.moment ?? "—"} />
            <Info k="Conservation" v={`${review.modesConservation.join(", ") || "—"} · ${conservation}`} />
            {review.packItems.length > 0 && (
              <Info
                k="Contenu du pack"
                v={review.packItems.map((i) => `${i.quantite > 1 ? `${i.quantite} × ` : ""}${i.nom}${i.statut && i.statut !== "ONLINE" ? " (pas encore en ligne)" : ""}`).join(", ")}
              />
            )}
          </div>
          {review.description && <p className="mb-4 mt-0 text-sm text-partner-ink">{review.description}</p>}

          <div className="mb-4">
            <div className="mb-1.5 text-[12.5px] text-partner-muted">Documents joints</div>
            {review.documents.length === 0 ? (
              <span className="text-sm text-partner-muted">Aucun document joint par la marque.</span>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {review.documents.map((d) => (
                  <li key={d.url}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 rounded-xl border border-partner-border bg-white px-3 py-2 text-sm hover:border-partner-heading/40"
                    >
                      <FileText className="h-5 w-5 flex-none text-partner-heading" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate">{d.nom}</b>
                        <span className="text-[12px] text-partner-muted">
                          {DOCUMENT_LABEL[d.type] ?? d.type}
                          {d.taille ? ` · ${formatFileSize(d.taille)}` : ""}
                        </span>
                      </span>
                      <span className="text-[12.5px] font-semibold text-partner-heading">Ouvrir</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-4">
            <div className="mb-1.5 text-[12.5px] text-partner-muted">Liste INCI</div>
            <div className="flex flex-wrap gap-1.5">
              {review.ingredients.length ? (
                review.ingredients.map((ing) => {
                  const bad = review.checks.excludedFound.some((x) => ing.toLowerCase().includes(x.toLowerCase()));
                  return (
                    <span
                      key={ing}
                      className={`rounded-full border px-2.5 py-0.5 text-[12.5px] ${bad ? "border-partner-danger bg-partner-dangerBg font-semibold text-partner-danger" : "border-partner-border bg-partner-bg text-partner-ink"}`}
                    >
                      {ing}
                    </span>
                  );
                })
              ) : (
                <span className="text-sm text-partner-danger">Aucun ingrédient renseigné.</span>
              )}
            </div>
          </div>

          <Checklist checks={PRODUCT_CHECKS} checked={checked} onToggle={(i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} />
          {/* Points automatiques non respectés : impossible de valider, on explique pourquoi. */}
          {(!review.checks.inciFilled || review.checks.excludedFound.length > 0 || !review.checks.targetingFilled) && (
            <div role="alert" className="mt-1 rounded-[14px] bg-partner-dangerBg px-3.5 py-3 text-[13px] text-partner-danger">
              <b className="block">« Valider et publier » est bloqué :</b>
              <ul className="m-0 mt-1 list-disc pl-5">
                {!review.checks.inciFilled && <li>la liste INCI est vide ;</li>}
                {review.checks.excludedFound.length > 0 && (
                  <li>ingrédient exclu par la Charte : {review.checks.excludedFound.join(", ")} ;</li>
                )}
                {!review.checks.targetingFilled && (
                  <li>
                    {review.skinTypes.length === 0 && review.needs.length === 0
                      ? "aucun type de peau ni besoin renseigné"
                      : review.needs.length === 0
                        ? "aucun besoin renseigné (types de peau : OK)"
                        : "aucun type de peau renseigné (besoins : OK)"}{" "}
                    ;
                  </li>
                )}
              </ul>
              <span className="mt-1 block text-partner-ink">
                Cliquez sur « Demander des corrections » : ces points sont envoyés à la marque, qui corrige puis renvoie le produit.
              </span>
            </div>
          )}
          <MessageField value={note} onChange={setNote} />
        </>
      )}
    </Drawer>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[12.5px] text-partner-muted">{k}</div>
      {v}
    </div>
  );
}
