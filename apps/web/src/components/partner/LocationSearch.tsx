"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

export interface PickedPlace {
  label: string;
  lat: number;
  lng: number;
}

interface Suggestion extends PickedPlace {
  detail: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    state?: string;
    county?: string;
    countrycode?: string;
    osm_key?: string;
    osm_value?: string;
  };
}

// Recherche de lieux OpenStreetMap (Photon), limitée à l'Algérie.
const PHOTON_URL = "https://photon.komoot.io/api/";
const ALGERIA_BBOX = "-8.7,18.9,12.0,37.2";
const DEBOUNCE_MS = 350;

const KIND_LABEL: Record<string, string> = {
  city: "Ville",
  town: "Ville",
  village: "Village",
  hamlet: "Hameau",
  suburb: "Quartier",
  administrative: "Wilaya / commune",
};

async function searchPlaces(query: string, signal: AbortSignal): Promise<Suggestion[]> {
  const params = new URLSearchParams({ q: query, limit: "8", lang: "fr", bbox: ALGERIA_BBOX });
  // Lieux habités et limites administratives seulement (pas de rues, commerces…).
  params.append("osm_tag", "place");
  params.append("osm_tag", "boundary:administrative");
  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Recherche de lieux indisponible (${res.status}).`);
  const data = (await res.json()) as { features: PhotonFeature[] };

  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const f of data.features) {
    const p = f.properties;
    if (p.countrycode !== "DZ" || !p.name) continue;
    const region = p.state && p.state !== p.name ? p.state : "";
    const label = region ? `${p.name}, ${region}` : p.name;
    if (seen.has(label)) continue;
    seen.add(label);
    const [lng, lat] = f.geometry.coordinates;
    out.push({ label, lat, lng, detail: KIND_LABEL[p.osm_value ?? ""] ?? "Lieu" });
  }
  return out.slice(0, 6);
}

/**
 * Champ « D'où vient la marque » : on tape une ville, un village ou une wilaya,
 * on choisit dans la liste, et le lieu est placé sur la carte de la page.
 */
export function LocationSearch({
  value,
  onPick,
  onClear,
}: {
  value: string;
  onPick: (place: PickedPlace) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const found = await searchPlaces(q, ctrl.signal);
        setResults(found);
        setActive(0);
        setStatus("idle");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function pick(s: Suggestion) {
    onPick({ label: s.label, lat: s.lat, lng: s.lng });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {value ? (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-partner-leaf bg-partner-leafBg px-3 py-2 text-[14px] text-partner-heading">
          <MapPin className="h-4 w-4 flex-none" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-semibold">{value}</span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Retirer le lieu"
            className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/70"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-partner-muted" aria-hidden="true" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={value ? "Changer de lieu : ville, village ou wilaya" : "Tapez une ville, un village ou une wilaya"}
          className="partner-input pl-9"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-partner-border bg-partner-card shadow-[0_14px_30px_-12px_rgba(20,40,30,0.3)]"
        >
          {status === "loading" && !results.length ? (
            <p className="px-3 py-2.5 text-[13px] text-partner-muted">Recherche…</p>
          ) : status === "error" ? (
            <p className="px-3 py-2.5 text-[13px] text-partner-warn">La recherche de lieux ne répond pas. Réessayez dans un instant.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-partner-muted">Aucun lieu trouvé en Algérie.</p>
          ) : (
            results.map((s, i) => (
              <button
                key={`${s.label}-${s.lat}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(s)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] aria-selected:bg-partner-leafBg"
              >
                <MapPin className="h-4 w-4 flex-none text-partner-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="text-[11.5px] text-partner-muted">{s.detail}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
