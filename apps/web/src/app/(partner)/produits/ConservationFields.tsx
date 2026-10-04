"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/partner/Chip";
import { CONSERVATION_MODES, CONSERVATION_MONTHS } from "./constants";

/** Un mois compte pour 30 jours (convention des mentions « 12M » des emballages). */
const DAYS_PER_MONTH = 30;

/**
 * Modes de conservation (plusieurs possibles, ex. au réfrigérateur et à l'abri
 * de la lumière) et durée de conservation après ouverture, saisie en mois ou en
 * jours mais toujours stockée en jours.
 */
export function ConservationFields({
  modes,
  days,
  onModesChange,
  onDaysChange,
}: {
  modes: string[];
  days: number | "";
  onModesChange: (modes: string[]) => void;
  onDaysChange: (days: number | "") => void;
}) {
  const [unit, setUnit] = useState<"mois" | "jours">("mois");

  // Une durée qui ne tombe pas sur des mois entiers s'affiche en jours.
  useEffect(() => {
    if (days !== "" && days % DAYS_PER_MONTH !== 0) setUnit("jours");
  }, [days]);

  const shown = days === "" ? "" : unit === "mois" ? days / DAYS_PER_MONTH : days;

  return (
    <>
      <div className="mb-3.5 flex flex-col gap-1.5">
        <span className="partner-lbl">Modes de conservation</span>
        <div className="flex flex-wrap gap-2">
          {CONSERVATION_MODES.map((m) => (
            <Chip
              key={m}
              pressed={modes.includes(m)}
              onClick={() => onModesChange(modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m])}
            >
              {m}
            </Chip>
          ))}
        </div>
        <span className="text-[12.5px] text-partner-muted">Plusieurs choix possibles.</span>
      </div>

      <div className="mb-3.5 flex flex-col gap-1.5">
        <span className="partner-lbl">Durée de conservation après ouverture</span>
        <div className="flex flex-wrap items-center gap-2">
          {CONSERVATION_MONTHS.map((m) => (
            <Chip
              key={m}
              pressed={days === m * DAYS_PER_MONTH}
              onClick={() => {
                setUnit("mois");
                onDaysChange(m * DAYS_PER_MONTH);
              }}
            >
              {m} mois
            </Chip>
          ))}
        </div>
        <div className="mt-1 flex max-w-[280px] items-center gap-2">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={shown}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              onDaysChange(e.target.value === "" || !(n > 0) ? "" : unit === "mois" ? n * DAYS_PER_MONTH : n);
            }}
            placeholder="Autre durée"
            aria-label="Durée de conservation après ouverture"
            className="partner-input w-[130px]"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "mois" | "jours")}
            aria-label="Unité de durée"
            className="partner-input w-[110px]"
          >
            <option value="mois">mois</option>
            <option value="jours">jours</option>
          </select>
        </div>
        <span className="text-[12.5px] text-partner-muted">
          Le petit pot ouvert sur l&apos;emballage (6M, 12M…). Obligatoire pour la vérification.
        </span>
      </div>
    </>
  );
}
