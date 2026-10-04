"use client";

import { Minus, Plus, X } from "lucide-react";
import type { Produit } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { ProductVisual } from "@/components/partner/ProductVisual";

export interface PackDraftItem {
  produitId: string;
  quantite: number;
}

/** Même limite que l'API. */
export const MAX_PACK_ITEMS = 10;
const MAX_QUANTITY = 10;

const NOT_READY: Record<string, string> = { DRAFT: "Brouillon", REJECTED: "Refusé", IN_REVIEW: "En vérification" };

/**
 * Contenu d'un pack : produits de la marque (jamais un autre pack) et quantités,
 * avec la valeur des produits achetés séparément pour situer le prix du pack.
 */
export function PackContentsField({
  candidates,
  items,
  packPrice,
  onChange,
}: {
  /** Produits de la marque qu'on peut mettre dans le pack. */
  candidates: Produit[];
  items: PackDraftItem[];
  packPrice: number;
  onChange: (items: PackDraftItem[]) => void;
}) {
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const available = candidates.filter((p) => !items.some((i) => i.produitId === p.id));
  const valeur = items.reduce((sum, i) => sum + (byId.get(i.produitId)?.prix ?? 0) * i.quantite, 0);
  const economie = valeur - packPrice;

  function setQuantity(produitId: string, quantite: number) {
    onChange(items.map((i) => (i.produitId === produitId ? { ...i, quantite: Math.min(MAX_QUANTITY, Math.max(1, quantite)) } : i)));
  }

  return (
    <div className="mb-3.5 flex flex-col gap-2">
      <span className="partner-lbl">Produits du pack</span>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const p = byId.get(item.produitId);
            const notReady = p ? NOT_READY[p.statut] : undefined;
            return (
              <li key={item.produitId} className="flex items-center gap-3 rounded-2xl border border-partner-border bg-partner-card p-2">
                <div className="h-11 w-11 flex-none overflow-hidden rounded-xl">
                  <ProductVisual imageUrl={p?.imagesUrls[0]} category={p?.categorieNom} name={p?.nom ?? "Produit"} />
                </div>
                <div className="min-w-0 flex-1 text-[13px]">
                  <b className="block truncate font-semibold">{p?.nom ?? "Produit introuvable"}</b>
                  <span className="text-partner-muted">
                    {p ? formatPrice(p.prix) : "—"}
                    {notReady && <span className="ml-1.5 text-partner-warn">· {notReady}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1" aria-label={`Quantité de ${p?.nom ?? "ce produit"}`}>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.produitId, item.quantite - 1)}
                    disabled={item.quantite <= 1}
                    aria-label="Retirer un exemplaire"
                    className="grid h-8 w-8 place-items-center rounded-full border border-partner-border disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantite}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.produitId, item.quantite + 1)}
                    disabled={item.quantite >= MAX_QUANTITY}
                    aria-label="Ajouter un exemplaire"
                    className="grid h-8 w-8 place-items-center rounded-full border border-partner-border disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((i) => i.produitId !== item.produitId))}
                  aria-label={`Retirer ${p?.nom ?? "ce produit"} du pack`}
                  className="grid h-8 w-8 flex-none place-items-center rounded-full text-partner-muted hover:text-partner-ink"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && items.length < MAX_PACK_ITEMS ? (
        <select
          value=""
          onChange={(e) => {
            const p = byId.get(e.target.value);
            if (!p) return;
            onChange([...items, { produitId: p.id, quantite: 1 }]);
          }}
          aria-label="Ajouter un produit au pack"
          className="partner-input"
        >
          <option value="">{items.length ? "Ajouter un autre produit…" : "Choisir un produit à mettre dans le pack…"}</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom} · {formatPrice(p.prix)}
              {NOT_READY[p.statut] ? ` (${NOT_READY[p.statut].toLowerCase()})` : ""}
            </option>
          ))}
        </select>
      ) : candidates.length < 2 ? (
        <p className="text-[12.5px] text-partner-warn">Ajoutez d&apos;abord au moins 2 produits : un pack se compose de vos produits.</p>
      ) : null}

      <span className="text-[12.5px] text-partner-muted">
        Au moins 2 produits. Le pack est visible par les clientes quand tous ses produits sont en ligne.
      </span>

      {items.length > 0 && (
        <div className="rounded-2xl bg-partner-bg px-3.5 py-2.5 text-[13px]">
          Valeur des produits achetés séparément : <b>{formatPrice(valeur)}</b>
          {packPrice > 0 &&
            (economie > 0 ? (
              <span className="block text-partner-heading">
                Prix du pack {formatPrice(packPrice)} : la cliente économise <b>{formatPrice(economie)}</b> ({Math.round((economie / valeur) * 100)} %).
              </span>
            ) : (
              <span className="block text-partner-warn">Le prix du pack n&apos;est pas inférieur à celui des produits achetés séparément.</span>
            ))}
        </div>
      )}
    </div>
  );
}
