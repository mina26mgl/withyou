"use client";

import { useState } from "react";
import type { AdminBoxDetail, BoxItemState } from "@withyou/shared-types";
import { Pencil, Plus } from "lucide-react";
import type { AdminBoxItem } from "@withyou/shared-types";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill, type StatusTone } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { BarRow, EmptyState, KpiGrid, LoadError, Panel, PanelHeader } from "@/components/partner/ui-blocks";
import { adminApi, sinceLabel } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";
import { BoxDrawer, BoxItemDrawer } from "./BoxEditors";

const ETAT: Record<BoxItemState, [StatusTone, string]> = {
  REUNI: ["ok", "Réuni"],
  MANQUE: ["danger", "Stock insuffisant"],
  ATTENTE: ["warn", "Sans réponse"],
};
const STATUT: Record<AdminBoxDetail["statut"], [StatusTone, string]> = {
  PREPARATION: ["info", "En préparation"],
  ASSEMBLEE: ["ok", "Assemblée"],
  EXPEDIEE: ["mute", "Expédiée"],
};
const fmt = (n: number) => n.toLocaleString("fr-FR");
const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default function AdminBoxPage() {
  const [boxId, setBoxId] = useState<string | null>(null);
  const boxes = usePartnerData((token) => adminApi.boxes(token));
  const { data: box, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => adminApi.box(token, boxId), boxId ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [boxEditor, setBoxEditor] = useState<"new" | "edit" | null>(null);
  const [itemEditor, setItemEditor] = useState<AdminBoxItem | "new" | null>(null);
  const { message, show } = useToast();

  async function run(id: string, fn: (token: string) => Promise<unknown>, toast: string) {
    const token = await getToken();
    if (!token) return;
    setBusyId(id);
    try {
      await fn(token);
      void reload();
      show(toast);
    } catch (e) {
      show(apiErrorMessage(e, "L'action a échoué."));
    } finally {
      setBusyId(null);
    }
  }

  const header = (
    <PageHeader
      title={box ? box.nom : "Box Rituel"}
      subtitle={
        box
          ? `Assemblage le ${longDate(box.dateAssemblage)}, expédition à partir du ${longDate(box.dateExpedition)}. Une variante par type de peau.`
          : "La box mensuelle envoyée aux abonnées, une variante par type de peau."
      }
      actions={
        <>
          <PillButton onClick={() => setBoxEditor("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Créer une box
          </PillButton>
          {box && (
            <PillButton variant="ghost" onClick={() => setBoxEditor("edit")}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Modifier la box
            </PillButton>
          )}
          {(boxes.data?.length ?? 0) > 1 && (
          <select
            value={box?.id ?? ""}
            onChange={(e) => setBoxId(e.target.value)}
            aria-label="Choisir une box"
            className="partner-input w-auto min-w-[220px] bg-white"
          >
            {boxes.data!.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
                {b.demo ? " (démo)" : ""}
              </option>
            ))}
          </select>
          )}
        </>
      }
    />
  );

  // Éditeurs : rendus même sans box (création de la première).
  const editors = (
    <>
      {boxEditor && (
        <BoxDrawer
          box={boxEditor === "edit" ? box ?? null : null}
          latest={box ?? null}
          getToken={getToken}
          onClose={() => setBoxEditor(null)}
          onSaved={(toast, id) => {
            setBoxEditor(null);
            void boxes.reload();
            if (id === boxId) void reload();
            else setBoxId(id);
            show(toast);
          }}
        />
      )}
      {itemEditor && box && (
        <BoxItemDrawer
          box={box}
          item={itemEditor === "new" ? null : itemEditor}
          getToken={getToken}
          onClose={() => setItemEditor(null)}
          onSaved={(toast) => {
            setItemEditor(null);
            void reload();
            show(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );

  if (error) return <>{header}<LoadError what="la box" message={errorMessage} /></>;
  if (loading) return <>{header}<p className="py-10 text-center text-partner-muted">Chargement…</p></>;
  if (!box)
    return (
      <>
        {header}
        <Panel>
          <EmptyState>Aucune box en préparation. Créez la prochaine avec « Créer une box ».</EmptyState>
        </Panel>
        {editors}
      </>
    );

  const abonnees = box.variantes.reduce((a, v) => a + v.abonnees, 0);
  const reunis = box.produits.filter((p) => p.etat === "REUNI").length;
  const days = Math.ceil((new Date(`${box.dateAssemblage}T12:00:00`).getTime() - Date.now()) / 86_400_000);
  const [tone, label] = STATUT[box.statut];

  return (
    <>
      {header}
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={tone}>{label}</StatusPill>
        {box.demo && <StatusPill tone="mute">Données de démonstration</StatusPill>}
      </div>
      <KpiGrid
        items={[
          { label: "Abonnées prévues", value: fmt(abonnees) },
          box.statut === "PREPARATION"
            ? { label: "Jours avant assemblage", value: days >= 0 ? String(days) : "Dépassé", tone: days <= 5 ? "down" : "muted", note: days <= 5 ? "à réunir en priorité" : undefined }
            : { label: "Assemblée le", value: longDate(box.dateAssemblage) },
          { label: "Produits réunis", value: `${reunis} sur ${box.produits.length}` },
          { label: "Candidatures à examiner", value: String(box.candidatures.filter((c) => c.statut === "NOUVELLE").length) },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[18px] max-[1180px]:grid-cols-1">
        <Panel>
          <PanelHeader
            title="Produits à réunir"
            sub="Besoin calculé à partir du nombre d'abonnées des variantes qui reçoivent le produit."
            aside={
              <PillButton variant="ghost" size="sm" onClick={() => setItemEditor("new")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ajouter un produit
              </PillButton>
            }
          />
          {box.produits.length === 0 ? (
            <EmptyState>Aucun produit prévu dans cette box pour l&apos;instant. Ajoutez-en avec « Ajouter un produit ».</EmptyState>
          ) : (
            <div className="-mx-1.5 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[12.5px] text-partner-muted">
                    {["Produit", "Variantes", "Besoin", "Confirmé", "État", ""].map((h, i) => (
                      <th key={h || i} className={`whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold ${i === 2 || i === 3 ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {box.produits.map((p) => {
                    const [t, l] = ETAT[p.etat];
                    return (
                      <tr key={p.id} className="border-b border-partner-border last:border-b-0">
                        <td className="px-3 py-3">
                          <b>{p.nom}</b>
                          <div className="text-[12.5px] text-partner-muted">{p.marque}</div>
                        </td>
                        <td className="px-3 py-3 text-[13px]">{p.variantes.map((v) => v.replace("Peau ", "")).join(", ")}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(p.besoin)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmt(p.confirme)}</td>
                        <td className="px-3 py-3">
                          <StatusPill tone={t}>{l}</StatusPill>
                          {p.etat === "MANQUE" && <div className="mt-1 text-[12px] text-partner-danger">Il manque {fmt(p.besoin - p.confirme)} unités</div>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <PillButton variant="ghost" size="sm" onClick={() => setItemEditor(p)}>
                              Modifier
                            </PillButton>
                          {p.etat !== "REUNI" && box.statut === "PREPARATION" && (
                            <div className="flex flex-col items-end gap-1">
                              <PillButton
                                variant="ghost"
                                size="sm"
                                disabled={busyId === p.id}
                                onClick={() => run(p.id, (tk) => adminApi.boxRelance(tk, p.id), `Relance enregistrée pour ${p.marque}.`)}
                              >
                                Relancer
                              </PillButton>
                              {p.relanceAt && <span className="text-[11.5px] text-partner-muted">relancée {sinceLabel(p.relanceAt)}</span>}
                            </div>
                          )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Abonnées par variante" sub="Types de peau déclarés ou issus du scan." />
          {box.variantes.map((v) => (
            <BarRow key={v.typePeau} label={`${v.typePeau.replace("Peau ", "")} · ${fmt(v.abonnees)}`} pct={abonnees ? Math.round((v.abonnees / abonnees) * 100) : 0} />
          ))}
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Candidatures des marques" sub="Produits proposés par les marques pour cette box." />
        {box.candidatures.length === 0 ? (
          <EmptyState>Aucune candidature pour cette box.</EmptyState>
        ) : (
          box.candidatures.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 border-b border-partner-border py-3.5 last:border-b-0">
              <div className="min-w-0">
                <b className="block leading-tight">{c.produit}</b>
                <span className="text-[12.5px] text-partner-muted">
                  {c.marque}, pour : {c.variante}
                </span>
              </div>
              {c.statut === "NOUVELLE" ? (
                <div className="flex gap-2">
                  <PillButton
                    variant="ghost"
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => run(c.id, (tk) => adminApi.boxDecide(tk, c.id, "REFUSEE"), `Candidature refusée. ${c.marque} est prévenue.`)}
                  >
                    Refuser
                  </PillButton>
                  <PillButton
                    size="sm"
                    disabled={busyId === c.id}
                    onClick={() => run(c.id, (tk) => adminApi.boxDecide(tk, c.id, "RETENUE"), `${c.produit} retenu pour ${box.nom.replace("Box Rituel ", "la box ")}.`)}
                  >
                    Retenir
                  </PillButton>
                </div>
              ) : c.statut === "RETENUE" ? (
                <StatusPill tone="ok">Retenue</StatusPill>
              ) : (
                <StatusPill tone="mute">Refusée</StatusPill>
              )}
            </div>
          ))
        )}
      </Panel>
      {editors}
    </>
  );
}
