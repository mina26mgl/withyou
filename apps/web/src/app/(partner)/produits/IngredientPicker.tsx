"use client";

import { Check } from "lucide-react";
import { KEY_INGREDIENTS } from "./constants";

/** Mêmes séparateurs que le serveur (splitInci) : virgules ou retours à la ligne. */
const splitInci = (inci: string) =>
  inci
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Grille d'ingrédients phares en image. Cocher un ingrédient ajoute son nom INCI à
 * la liste INCI ; le décocher l'en retire. Le reste de la liste n'est pas touché.
 */
export function IngredientPicker({ inci, onChange }: { inci: string; onChange: (inci: string) => void }) {
  const entries = splitInci(inci);
  const has = (name: string) => entries.some((e) => e.toLowerCase() === name.toLowerCase());

  function toggle(name: string) {
    const next = has(name) ? entries.filter((e) => e.toLowerCase() !== name.toLowerCase()) : [...entries, name];
    onChange(next.join(", "));
  }

  return (
    <div className="mb-3.5">
      <span className="partner-lbl">Ingrédients phares</span>
      <p className="mb-2.5 mt-1 text-[12.5px] text-partner-muted">Touchez les ingrédients de votre produit : ils sont ajoutés à la liste INCI.</p>
      <div className="grid grid-cols-4 gap-2.5 max-[560px]:grid-cols-3">
        {KEY_INGREDIENTS.map((ing) => {
          const on = has(ing.inci);
          return (
            <button
              key={ing.inci}
              type="button"
              onClick={() => toggle(ing.inci)}
              aria-pressed={on}
              title={ing.inci}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2 text-center transition-colors ${
                on ? "border-partner-leaf bg-partner-leafBg" : "border-partner-border bg-partner-card hover:border-partner-muted"
              }`}
            >
              {on && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-partner-leaf text-white">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ing.image} alt="" className="h-14 w-14 object-contain" />
              <span className={`text-[12.5px] leading-tight ${on ? "font-semibold text-partner-heading" : "text-partner-ink"}`}>{ing.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
