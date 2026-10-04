"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { AdminSalon, AdminSalonInput } from "@withyou/shared-types";
import { WILAYAS } from "@withyou/shared-utils";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, KpiGrid, LoadError, Panel, Tabs } from "@/components/partner/ui-blocks";
import { adminApi } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

type Filter = "all" | "trained" | "todo";
const SALON_TYPES = ["Coiffure", "Esthétique", "Coiffure et esthétique", "Spa", "Barbier"] as const;

export default function AdminSalonsPage() {
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => adminApi.salons(token));
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<AdminSalon | "new" | null>(null);
  const { message, show } = useToast();
  const salons = data ?? [];
  const match = (s: AdminSalon, f: Filter) => f === "all" || (f === "trained" ? s.formee : !s.formee);
  const list = salons.filter((s) => match(s, filter));

  return (
    <>
      <PageHeader
        title="Salons partenaires"
        subtitle="Le réseau terrain : les salons recommandent withyou avec leur code, testent les produits et renvoient l'avis de leurs clientes."
        actions={
          <PillButton onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un salon
          </PillButton>
        }
      />
      <KpiGrid
        items={[
          { label: "Salons partenaires", value: String(salons.filter((s) => s.active).length), note: "objectif : 100", tone: "muted" },
          { label: "Formés", value: String(salons.filter((s) => s.formee).length), note: `sur ${salons.length}`, tone: "muted" },
          { label: "À former", value: String(salons.filter((s) => !s.formee).length) },
          { label: "Tests produits attribués", value: String(salons.reduce((a, s) => a + s.tests, 0)) },
        ]}
      />
      <Panel>
        <div className="mb-3.5">
          <Tabs<Filter>
            label="Filtrer les salons"
            value={filter}
            onChange={setFilter}
            items={(
              [
                ["all", "Tous"],
                ["trained", "Formés"],
                ["todo", "À former"],
              ] as const
            ).map(([key, label]) => ({ key, label, count: salons.filter((s) => match(s, key)).length }))}
          />
        </div>
        {error ? (
          <LoadError what="les salons" message={errorMessage} />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <EmptyState>{loading ? "Chargement…" : salons.length ? "Aucun salon dans cette catégorie." : "Aucun salon partenaire pour l'instant."}</EmptyState>
            {!loading && !salons.length && (
              <PillButton onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ajouter un salon
              </PillButton>
            )}
          </div>
        ) : (
          <div className="-mx-1.5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[12.5px] text-partner-muted">
                  {["Salon", "Wilaya", "Code partenaire", "Tests", "Formation", ""].map((h, i) => (
                    <th key={h || i} className={`whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold ${i === 3 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className={`border-b border-partner-border last:border-b-0 ${s.active ? "" : "opacity-60"}`}>
                    <td className="px-3 py-3">
                      <b>{s.nom}</b>
                      <div className="text-[12.5px] text-partner-muted">
                        {s.type || "—"}
                        {!s.active && " · en pause"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {s.wilaya}
                      {s.ville && <div className="text-[12.5px] text-partner-muted">{s.ville}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <code className="text-[13px]">{s.code}</code>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{s.tests}</td>
                    <td className="px-3 py-3">{s.formee ? <StatusPill tone="ok">Formé</StatusPill> : <StatusPill tone="warn">À former</StatusPill>}</td>
                    <td className="px-3 py-3 text-right">
                      <PillButton variant="ghost" size="sm" onClick={() => setEditing(s)}>
                        Modifier
                      </PillButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <SalonDrawer
          salon={editing === "new" ? null : editing}
          getToken={getToken}
          onClose={() => setEditing(null)}
          onSaved={(toast) => {
            setEditing(null);
            void reload();
            show(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );
}

function SalonDrawer({
  salon,
  getToken,
  onClose,
  onSaved,
}: {
  salon: AdminSalon | null;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onSaved: (toast: string) => void;
}) {
  const [nom, setNom] = useState(salon?.nom ?? "");
  const [type, setType] = useState(salon?.type ?? "");
  const [wilaya, setWilaya] = useState(salon?.wilaya ?? "");
  const [ville, setVille] = useState(salon?.ville ?? "");
  const [code, setCode] = useState(salon?.code ?? "");
  const [telephone, setTelephone] = useState(salon?.telephone ?? "");
  const [formee, setFormee] = useState(salon?.formee ?? false);
  const [active, setActive] = useState(salon?.active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr(null);
    const cleanCode = code.trim().toUpperCase();
    if (nom.trim().length < 2) return setErr("Indiquez le nom du salon.");
    if (!wilaya) return setErr("Choisissez la wilaya.");
    if (cleanCode && !/^[A-Z0-9]{3,20}$/.test(cleanCode)) return setErr("Code partenaire : 3 à 20 lettres ou chiffres, sans espace.");
    const dto: AdminSalonInput = {
      nom: nom.trim(),
      type: type.trim(),
      wilaya,
      ville: ville.trim() || null,
      code: cleanCode || null,
      formee,
      active,
      telephone: telephone.trim() || null,
    };
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (salon) {
        await adminApi.updateSalon(token, salon.id, dto);
        onSaved(`${dto.nom} est mis à jour.`);
      } else {
        const r = await adminApi.createSalon(token, dto);
        onSaved(`${dto.nom} est ajouté. Code partenaire : ${r.code}.`);
      }
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
      title={salon ? `Modifier ${salon.nom}` : "Ajouter un salon"}
      subtitle="Le salon recommande withyou à ses clientes avec son code, et peut tester les produits des marques."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            {salon ? "Enregistrer" : "Ajouter"}
          </PillButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Nom du salon</span>
          <input type="text" maxLength={80} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Salon Lumière" className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Téléphone</span>
          <input type="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Wilaya</span>
          <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="partner-input">
            <option value="">— Choisir —</option>
            {WILAYAS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Commune ou quartier</span>
          <input type="text" maxLength={80} value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Ex. Hydra" className="partner-input" />
        </label>
      </div>

      <div className="mt-3.5 flex flex-col gap-1.5">
        <span className="partner-lbl">Type de salon</span>
        <div className="flex flex-wrap gap-2">
          {SALON_TYPES.map((t) => (
            <Chip key={t} pressed={type === t} onClick={() => setType(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-3.5 flex max-w-[320px] flex-col gap-1.5">
        <label htmlFor="scode" className="partner-lbl">
          Code partenaire
        </label>
        <input
          id="scode"
          type="text"
          maxLength={20}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Laissez vide pour le générer"
          className="partner-input uppercase tabular-nums"
        />
        <span className="text-[12.5px] text-partner-muted">Donné aux clientes du salon. Vide : créé à partir du nom (ex. LUMIERE10).</span>
      </div>

      <div className="mt-3.5 flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={formee} onChange={(e) => setFormee(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
          L&apos;équipe du salon est formée aux produits et au diagnostic withyou
        </label>
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
          Partenariat actif
        </label>
      </div>
    </Drawer>
  );
}
