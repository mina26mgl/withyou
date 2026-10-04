"use client";

import { Camera, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import type { BrandNeed, BrandPageCandidates } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { Chip } from "@/components/partner/Chip";
import { Stars } from "@/components/partner/Stars";
import { NEEDS } from "../produits/constants";

export const NEEDS_MAX = 6;
export const FEATURED_REVIEWS_MAX = 3;

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-partner-border bg-partner-bg px-3 py-3 text-[13px] text-partner-muted">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Pour quels besoins ?                                                */
/* ------------------------------------------------------------------ */

export function NeedsEditor({
  needs,
  candidates,
  onChange,
  onPhoto,
  onLimit,
}: {
  needs: BrandNeed[];
  candidates: BrandPageCandidates | null;
  onChange: (needs: BrandNeed[]) => void;
  onPhoto: (label: string, file: File) => void;
  onLimit: (message: string) => void;
}) {
  const selected = new Set(needs.map((n) => n.label));

  function toggle(label: string) {
    if (selected.has(label)) {
      onChange(needs.filter((n) => n.label !== label));
    } else if (needs.length >= NEEDS_MAX) {
      onLimit(`${NEEDS_MAX} besoins au maximum.`);
    } else {
      onChange([...needs, { label, imageUrl: null }]);
    }
  }

  const countFor = (label: string) => candidates?.produits.filter((p) => p.needs.includes(label)).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {NEEDS.map((label) => (
          <Chip key={label} pressed={selected.has(label)} onClick={() => toggle(label)}>
            {label}
          </Chip>
        ))}
      </div>

      {needs.length > 0 && (
        <div className="flex flex-col gap-2">
          {needs.map((need) => {
            const count = countFor(need.label);
            return (
              <div key={need.label} className="flex items-center gap-3 rounded-2xl border border-partner-border bg-partner-bg p-2">
                <label
                  className="relative grid h-14 w-14 flex-none cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-partner-border bg-partner-card text-partner-muted hover:border-partner-leaf"
                  title={need.imageUrl ? "Changer la photo" : "Ajouter une photo"}
                >
                  {need.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={need.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-5 w-5" aria-hidden="true" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label={`Photo pour ${need.label}`}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onPhoto(need.label, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-partner-ink">{need.label}</div>
                  <div className="text-[12.5px] text-partner-muted">
                    {count
                      ? `${count} produit${count > 1 ? "s" : ""} en ligne — « Voir » les affichera`
                      : "Aucun produit en ligne pour ce besoin : cochez-le dans vos fiches produit"}
                    {!need.imageUrl && " · sans photo, celle d'un produit est utilisée"}
                  </div>
                </div>
                {need.imageUrl && (
                  <button
                    type="button"
                    onClick={() => onChange(needs.map((n) => (n.label === need.label ? { ...n, imageUrl: null } : n)))}
                    className="text-[12.5px] font-semibold text-partner-muted hover:text-partner-danger"
                  >
                    Retirer la photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggle(need.label)}
                  aria-label={`Retirer le besoin ${need.label}`}
                  className="grid h-9 w-9 flex-none place-items-center rounded-full border border-partner-border bg-partner-card text-partner-muted hover:border-partner-danger hover:text-partner-danger"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Leurs produits                                                      */
/* ------------------------------------------------------------------ */

export function ProductsEditor({
  featured,
  candidates,
  onChange,
}: {
  featured: string[];
  candidates: BrandPageCandidates | null;
  onChange: (ids: string[]) => void;
}) {
  const produits = candidates?.produits ?? [];
  if (!candidates) return <Hint>Chargement de vos produits…</Hint>;
  if (!produits.length) {
    return <Hint>Aucun produit en ligne pour l&apos;instant. Dès qu&apos;un produit est validé, vous pourrez le choisir ici.</Hint>;
  }

  const toggle = (id: string) => onChange(featured.includes(id) ? featured.filter((x) => x !== id) : [...featured, id]);
  const move = (id: string, delta: number) => {
    const i = featured.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= featured.length) return;
    const next = [...featured];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  // Produits choisis d'abord, dans l'ordre d'affichage, puis les autres.
  const ordered = [
    ...featured.map((id) => produits.find((p) => p.id === id)).filter((p): p is (typeof produits)[number] => !!p),
    ...produits.filter((p) => !featured.includes(p.id)),
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-partner-muted">
        {featured.length
          ? `${featured.length} produit${featured.length > 1 ? "s" : ""} mis en avant, dans cet ordre.`
          : "Aucune sélection : tous vos produits en ligne s'affichent. Cochez-en pour choisir lesquels et dans quel ordre."}
      </p>
      {ordered.map((p) => {
        const pos = featured.indexOf(p.id);
        const on = pos >= 0;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl border p-2 ${on ? "border-partner-leaf bg-partner-leafBg" : "border-partner-border bg-partner-bg"}`}
          >
            <button
              type="button"
              onClick={() => toggle(p.id)}
              aria-pressed={on}
              aria-label={on ? `Ne plus mettre en avant ${p.nom}` : `Mettre en avant ${p.nom}`}
              className={`grid h-6 w-6 flex-none place-items-center rounded-md border ${on ? "border-partner-leaf bg-partner-leaf text-white" : "border-partner-border bg-partner-card"}`}
            >
              {on && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
            <div className="h-11 w-11 flex-none overflow-hidden rounded-lg bg-partner-card">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-partner-ink">{p.nom}</div>
              <div className="text-[12.5px] text-partner-muted">{formatPrice(p.prix)}</div>
            </div>
            {on && (
              <span className="flex flex-none items-center gap-1">
                <span className="mr-1 text-[12px] font-semibold text-partner-heading">#{pos + 1}</span>
                <button type="button" onClick={() => move(p.id, -1)} disabled={pos === 0} aria-label="Monter" className="grid h-8 w-8 place-items-center rounded-full border border-partner-border bg-partner-card disabled:opacity-40">
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(p.id, 1)} disabled={pos === featured.length - 1} aria-label="Descendre" className="grid h-8 w-8 place-items-center rounded-full border border-partner-border bg-partner-card disabled:opacity-40">
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ce que disent les clientes                                          */
/* ------------------------------------------------------------------ */

export function ReviewsEditor({
  featured,
  candidates,
  onChange,
  onLimit,
}: {
  featured: string[];
  candidates: BrandPageCandidates | null;
  onChange: (ids: string[]) => void;
  onLimit: (message: string) => void;
}) {
  if (!candidates) return <Hint>Chargement des avis…</Hint>;
  if (!candidates.avis.length) {
    return <Hint>Pas encore d&apos;avis. Après leurs achats, les avis de vos clientes apparaîtront ici et vous choisirez ceux à afficher.</Hint>;
  }

  const toggle = (id: string) => {
    if (featured.includes(id)) onChange(featured.filter((x) => x !== id));
    else if (featured.length >= FEATURED_REVIEWS_MAX) onLimit(`${FEATURED_REVIEWS_MAX} avis au maximum sur la page.`);
    else onChange([...featured, id]);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-partner-muted">
        {featured.length
          ? `${featured.length} / ${FEATURED_REVIEWS_MAX} avis choisis.`
          : `Aucune sélection : les ${FEATURED_REVIEWS_MAX} avis les mieux notés s'affichent. Cochez-en jusqu'à ${FEATURED_REVIEWS_MAX} pour choisir vous-même.`}
      </p>
      {candidates.avis.map((a) => {
        const on = featured.includes(a.id);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => toggle(a.id)}
            aria-pressed={on}
            className={`flex items-start gap-3 rounded-2xl border p-3 text-left ${on ? "border-partner-leaf bg-partner-leafBg" : "border-partner-border bg-partner-bg"}`}
          >
            <span className={`mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md border ${on ? "border-partner-leaf bg-partner-leaf text-white" : "border-partner-border bg-partner-card"}`}>
              {on && <Check className="h-4 w-4" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <b className="text-[14px] text-partner-ink">{a.auteur}</b>
                <Stars value={a.stars} />
              </span>
              <span className="mt-1 block text-[13px] text-partner-muted">{a.texte}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
