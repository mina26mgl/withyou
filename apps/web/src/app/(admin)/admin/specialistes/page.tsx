"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { AdminSpecialist, AdminSpecialistInput, SpecialistCategory } from "@withyou/shared-types";
import { WILAYAS } from "@withyou/shared-utils";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, LoadError, Panel, Tabs } from "@/components/partner/ui-blocks";
import { adminApi } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

const ROLES: Record<SpecialistCategory, string[]> = {
  EXPERT: ["Dermatologue", "Cosmétologue", "Esthéticienne formatrice", "Conseillère beauté", "Pharmacienne"],
  CREATRICE: ["Créatrice skincare, Instagram", "Créatrice routines, TikTok", "Créatrice cosmétique naturelle", "Créatrice cheveux, Instagram"],
};
const initials = (s: AdminSpecialist) => `${s.prenom.replace(/^Dr\.?\s*/i, "").charAt(0)}${s.nom.charAt(0)}`.toUpperCase();

export default function AdminSpecialistsPage() {
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => adminApi.specialists(token));
  const [tab, setTab] = useState<SpecialistCategory>("EXPERT");
  const [editing, setEditing] = useState<AdminSpecialist | "new" | null>(null);
  const { message, show } = useToast();
  const all = data ?? [];
  const list = all.filter((s) => s.categorie === tab);

  return (
    <>
      <PageHeader
        title="Spécialistes beauté"
        subtitle="Les experts qui garantissent la qualité des conseils, et les créatrices formées qui racontent les marques."
        actions={
          <PillButton onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Ajouter un spécialiste
          </PillButton>
        }
      />
      <Tabs<SpecialistCategory>
        label="Catégorie"
        value={tab}
        onChange={setTab}
        items={[
          { key: "EXPERT", label: "Experts beauté", count: all.filter((s) => s.categorie === "EXPERT").length },
          { key: "CREATRICE", label: "Créatrices", count: all.filter((s) => s.categorie === "CREATRICE").length },
        ]}
      />
      {error ? (
        <LoadError what="les spécialistes" message={errorMessage} />
      ) : list.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <EmptyState>{loading ? "Chargement…" : tab === "EXPERT" ? "Aucun expert beauté pour l'instant." : "Aucune créatrice pour l'instant."}</EmptyState>
            {!loading && (
              <PillButton onClick={() => setEditing("new")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ajouter un spécialiste
              </PillButton>
            )}
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-2 gap-4 max-[1180px]:grid-cols-1">
          {list.map((s) => (
            <Panel key={s.id} className={s.actif ? undefined : "opacity-60"}>
              <div className="flex items-start gap-3.5">
                <div
                  className={`grid h-[54px] w-[54px] flex-none place-items-center rounded-full font-partner-heading text-[22px] text-white ${s.categorie === "EXPERT" ? "bg-[#7FB8CF]" : "bg-[#C9A3B0]"}`}
                >
                  {initials(s)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-partner-heading text-[19px] leading-tight text-partner-heading">
                      {s.prenom} {s.nom}
                    </h3>
                    {!s.actif && <StatusPill tone="mute">En pause</StatusPill>}
                  </div>
                  <div className="text-[13px] text-partner-muted">
                    {s.role}, {s.wilaya}
                  </div>
                  {s.description && <p className="mb-0 mt-2.5 text-sm">{s.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-partner-muted">
                    {s.categorie === "EXPERT" ? (
                      <div>
                        <b className="block text-[14px] text-partner-ink">{s.disponibilites ?? "—"}</b>disponibilités
                      </div>
                    ) : (
                      <>
                        <div>
                          <b className="block text-[14px] text-partner-ink">{s.audience ?? "—"}</b>audience
                        </div>
                        {s.reseau && (
                          <div>
                            <b className="block text-[14px] text-partner-ink">{s.reseau}</b>réseau
                          </div>
                        )}
                      </>
                    )}
                    {(s.telephone || s.email) && (
                      <div>
                        <b className="block text-[14px] text-partner-ink">{[s.telephone, s.email].filter(Boolean).join(" · ")}</b>contact
                      </div>
                    )}
                  </div>
                </div>
                <PillButton variant="ghost" size="sm" onClick={() => setEditing(s)}>
                  Modifier
                </PillButton>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {editing && (
        <SpecialistDrawer
          specialist={editing === "new" ? null : editing}
          defaultCategory={tab}
          getToken={getToken}
          onClose={() => setEditing(null)}
          onSaved={(toast, categorie) => {
            setEditing(null);
            setTab(categorie);
            void reload();
            show(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );
}

function SpecialistDrawer({
  specialist,
  defaultCategory,
  getToken,
  onClose,
  onSaved,
}: {
  specialist: AdminSpecialist | null;
  defaultCategory: SpecialistCategory;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onSaved: (toast: string, categorie: SpecialistCategory) => void;
}) {
  const [categorie, setCategorie] = useState<SpecialistCategory>(specialist?.categorie ?? defaultCategory);
  const [prenom, setPrenom] = useState(specialist?.prenom ?? "");
  const [nom, setNom] = useState(specialist?.nom ?? "");
  const [role, setRole] = useState(specialist?.role ?? "");
  const [wilaya, setWilaya] = useState(specialist?.wilaya ?? "");
  const [description, setDescription] = useState(specialist?.description ?? "");
  const [disponibilites, setDisponibilites] = useState(specialist?.disponibilites ?? "");
  const [audience, setAudience] = useState(specialist?.audience ?? "");
  const [reseau, setReseau] = useState(specialist?.reseau ?? "");
  const [telephone, setTelephone] = useState(specialist?.telephone ?? "");
  const [email, setEmail] = useState(specialist?.email ?? "");
  const [actif, setActif] = useState(specialist?.actif ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const expert = categorie === "EXPERT";

  async function save() {
    setErr(null);
    if (!prenom.trim()) return setErr("Indiquez le prénom.");
    if (role.trim().length < 2) return setErr(expert ? "Indiquez le métier." : "Indiquez le type de contenu.");
    if (!wilaya) return setErr("Choisissez la wilaya.");
    const dto: AdminSpecialistInput = {
      categorie,
      prenom: prenom.trim(),
      nom: nom.trim(),
      role: role.trim(),
      wilaya,
      description: description.trim(),
      disponibilites: expert ? disponibilites.trim() || null : null,
      audience: expert ? null : audience.trim() || null,
      reseau: expert ? null : reseau.trim() || null,
      telephone: telephone.trim() || null,
      email: email.trim() || null,
      actif,
    };
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (specialist) await adminApi.updateSpecialist(token, specialist.id, dto);
      else await adminApi.createSpecialist(token, dto);
      onSaved(`${dto.prenom} ${dto.nom} ${specialist ? "est mis(e) à jour" : "est ajouté(e)"}.`, categorie);
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
      title={specialist ? `Modifier ${specialist.prenom} ${specialist.nom}` : "Ajouter un spécialiste"}
      subtitle="Experts qui relisent les conseils et forment les salons, créatrices qui racontent les marques."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            {specialist ? "Enregistrer" : "Ajouter"}
          </PillButton>
        </>
      }
    >
      <div className="mb-3.5 flex flex-wrap gap-2">
        <Chip pressed={expert} onClick={() => setCategorie("EXPERT")}>
          Expert beauté
        </Chip>
        <Chip pressed={!expert} onClick={() => setCategorie("CREATRICE")}>
          Créatrice
        </Chip>
      </div>
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Prénom</span>
          <input type="text" maxLength={60} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder={expert ? "Ex. Dr Lamia" : "Ex. Nour"} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Nom</span>
          <input type="text" maxLength={60} value={nom} onChange={(e) => setNom(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">{expert ? "Métier" : "Type de contenu"}</span>
          <input type="text" list="roles" maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} className="partner-input" />
          <datalist id="roles">
            {ROLES[categorie].map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
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
      </div>
      <label className="mt-3.5 flex flex-col gap-1.5">
        <span className="partner-lbl">{expert ? "Mission chez withyou" : "Marques accompagnées"}</span>
        <textarea
          rows={3}
          maxLength={400}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={expert ? "Ex. Relit les routines générées pour les peaux sensibles." : "Ex. Azul, Namira"}
          className="partner-input resize-y"
        />
      </label>
      <div className="mt-3.5 grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        {expert ? (
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Disponibilités</span>
            <input type="text" maxLength={120} value={disponibilites} onChange={(e) => setDisponibilites(e.target.value)} placeholder="Ex. Mardi et jeudi" className="partner-input" />
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="partner-lbl">Audience</span>
              <input type="text" maxLength={60} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex. 48 k abonnées" className="partner-input" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="partner-lbl">Compte ou lien</span>
              <input type="text" maxLength={120} value={reseau} onChange={(e) => setReseau(e.target.value)} placeholder="Ex. @nourbeauty" className="partner-input" />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Téléphone</span>
          <input type="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">E-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="partner-input" />
        </label>
      </div>
      <label className="mt-3.5 flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
        Travaille actuellement avec withyou
      </label>
    </Drawer>
  );
}
