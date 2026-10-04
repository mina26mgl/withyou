"use client";
import { Sparkles } from "lucide-react";

/** Interrupteur du formulaire de connexion : activé, on entre dans l'app cliente ; sinon dans l'espace pro. */
export function ConsumerToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#DCE8DF] bg-white px-4 py-3 transition hover:border-[#4A6E4F]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF6EE] text-[#07320D]">
        <Sparkles size={16} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-[#07320D]">Espace consommatrice</span>
        <span className="block text-xs" style={{ color: "#4A6E4F" }}>
          {checked ? "Connexion à l'app cliente" : "Activez pour vous connecter en tant que cliente"}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Espace consommatrice"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4A6E4F]/40 ${
          checked ? "bg-[#07320D]" : "bg-[#DCE8DF]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
