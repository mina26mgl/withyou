"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { AdminBrandLegal, AdminBrandLegalInput } from "@withyou/shared-types";
import { PillButton } from "@/components/partner/PillButton";
import { adminLegalApi, BANQUES } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";

type GetToken = () => Promise<string | null>;
const OTHER = "__autre__";

/** « 00100123012345678901 » → « 001 00123 0123456789 01 » (banque, agence, compte, clé). */
const formatRib = (rib: string) => rib.replace(/^(\d{3})(\d{5})(\d{10})(\d{2})$/, "$1 $2 $3 $4");
const maskRib = (rib: string) => `${rib.slice(0, 3)} ••••• •••••••${rib.slice(-5, -2)} ${rib.slice(-2)}`;
const digits = (v: string) => v.replace(/\s+/g, "");

const FIELDS: { key: keyof AdminBrandLegalInput; label: string; hint: string; numeric?: boolean }[] = [
  { key: "nif", label: "NIF", hint: "Numéro d'identification fiscale, 15 chiffres", numeric: true },
  { key: "nis", label: "NIS", hint: "Numéro d'identification statistique, 15 chiffres", numeric: true },
  { key: "rc", label: "RC", hint: "Registre de commerce (ex. 16/00-1234567 B 20) ou carte d'artisan" },
  { key: "articleImposition", label: "Article d'imposition", hint: "11 chiffres", numeric: true },
];

/**
 * Informations fiscales et bancaires de la marque, dans son panneau de la console.
 * Lecture par défaut (RIB masqué), passage en saisie avec « Modifier ».
 */
export function BrandLegalSection({ marqueId, getToken }: { marqueId: string; getToken: GetToken }) {
  const [legal, setLegal] = useState<AdminBrandLegal | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showRib, setShowRib] = useState(false);
  const [form, setForm] = useState<Record<keyof AdminBrandLegalInput, string>>({ nif: "", nis: "", rc: "", articleImposition: "", rib: "", banque: "" });
  const [bankChoice, setBankChoice] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        setLegal(await adminLegalApi.get(token, marqueId));
      } catch (e) {
        setLoadErr(apiErrorMessage(e, "Impossible de charger les informations fiscales."));
      }
    })();
  }, [getToken, marqueId]);

  function startEdit() {
    if (!legal) return;
    setForm({
      nif: legal.nif ?? "",
      nis: legal.nis ?? "",
      rc: legal.rc ?? "",
      articleImposition: legal.articleImposition ?? "",
      rib: legal.rib ? formatRib(legal.rib) : "",
      banque: legal.banque ?? "",
    });
    setBankChoice(!legal.banque ? "" : (BANQUES as readonly string[]).includes(legal.banque) ? legal.banque : OTHER);
    setErr(null);
    setEditing(true);
  }

  async function save() {
    setErr(null);
    const dto: AdminBrandLegalInput = {
      nif: digits(form.nif) || null,
      nis: digits(form.nis) || null,
      rc: form.rc.trim() || null,
      articleImposition: digits(form.articleImposition) || null,
      rib: digits(form.rib) || null,
      banque: (bankChoice === OTHER ? form.banque.trim() : bankChoice) || null,
    };
    if (dto.nif && !/^\d{15,20}$/.test(dto.nif)) return setErr("Le NIF doit contenir 15 à 20 chiffres.");
    if (dto.nis && !/^\d{15}$/.test(dto.nis)) return setErr("Le NIS doit contenir 15 chiffres.");
    if (dto.articleImposition && !/^\d{11}$/.test(dto.articleImposition)) return setErr("L'article d'imposition doit contenir 11 chiffres.");
    if (dto.rib && !/^\d{20}$/.test(dto.rib)) return setErr("Le RIB doit contenir 20 chiffres.");
    if (dto.rib && !dto.banque) return setErr("Indiquez la banque du RIB.");

    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      setLegal(await adminLegalApi.save(token, marqueId, dto));
      setEditing(false);
      setShowRib(false);
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  const title = (
    <h3 className="mb-3 mt-5 flex items-center gap-2 border-t border-partner-border pt-5 text-[14.5px] font-bold text-partner-heading">
      <Lock className="h-4 w-4" aria-hidden="true" />
      Informations fiscales et bancaires
    </h3>
  );

  if (loadErr) return <>{title}<p className="text-sm text-partner-danger">{loadErr}</p></>;
  if (!legal) return <>{title}<p className="text-sm text-partner-muted">Chargement…</p></>;

  if (!editing) {
    const empty = !legal.nif && !legal.nis && !legal.rc && !legal.articleImposition && !legal.rib;
    return (
      <>
        {title}
        {empty ? (
          <p className="mb-3 text-sm text-partner-muted">Aucune information renseignée pour cette marque.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm max-[700px]:grid-cols-1">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="text-[12.5px] text-partner-muted">{f.label}</div>
                <span className="tabular-nums">{legal[f.key] ?? "—"}</span>
              </div>
            ))}
            <div>
              <div className="text-[12.5px] text-partner-muted">Banque</div>
              {legal.banque ?? "—"}
            </div>
            <div>
              <div className="text-[12.5px] text-partner-muted">RIB</div>
              {legal.rib ? (
                <span className="inline-flex items-center gap-2 tabular-nums">
                  {showRib ? formatRib(legal.rib) : maskRib(legal.rib)}
                  <button
                    type="button"
                    onClick={() => setShowRib((v) => !v)}
                    aria-label={showRib ? "Masquer le RIB" : "Afficher le RIB"}
                    className="text-partner-muted hover:text-partner-ink"
                  >
                    {showRib ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </span>
              ) : (
                "—"
              )}
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[12.5px] text-partner-muted">
            {legal.updatedAt ? `Mis à jour le ${new Date(legal.updatedAt).toLocaleDateString("fr-FR")} par ${legal.updatedBy ?? "—"}` : ""}
          </span>
          <PillButton variant="ghost" size="sm" onClick={startEdit}>
            {empty ? "Renseigner" : "Modifier"}
          </PillButton>
        </div>
      </>
    );
  }

  return (
    <>
      {title}
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <label htmlFor={`legal-${f.key}`} className="partner-lbl">
              {f.label}
            </label>
            <input
              id={`legal-${f.key}`}
              type="text"
              inputMode={f.numeric ? "numeric" : undefined}
              value={form[f.key]}
              onChange={(e) => setForm((cur) => ({ ...cur, [f.key]: e.target.value }))}
              className="partner-input tabular-nums"
            />
            <span className="text-[12px] text-partner-muted">{f.hint}</span>
          </div>
        ))}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="legal-banque" className="partner-lbl">
            Banque
          </label>
          <select id="legal-banque" value={bankChoice} onChange={(e) => setBankChoice(e.target.value)} className="partner-input">
            <option value="">— Choisir —</option>
            {BANQUES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value={OTHER}>Autre banque…</option>
          </select>
          {bankChoice === OTHER && (
            <input
              type="text"
              maxLength={80}
              value={form.banque}
              onChange={(e) => setForm((cur) => ({ ...cur, banque: e.target.value }))}
              placeholder="Nom de la banque"
              aria-label="Nom de la banque"
              className="partner-input"
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="legal-rib" className="partner-lbl">
            RIB
          </label>
          <input
            id="legal-rib"
            type="text"
            inputMode="numeric"
            value={form.rib}
            onChange={(e) => setForm((cur) => ({ ...cur, rib: e.target.value }))}
            placeholder="001 00123 0123456789 01"
            className="partner-input tabular-nums"
          />
          <span className="text-[12px] text-partner-muted">20 chiffres : banque, agence, compte, clé</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
        <PillButton variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Annuler
        </PillButton>
        <PillButton size="sm" disabled={busy} onClick={save}>
          Enregistrer ces informations
        </PillButton>
      </div>
    </>
  );
}
