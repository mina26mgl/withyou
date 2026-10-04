"use client";

import { useState } from "react";
import type { AdminBrandRow, AdminTeamMember } from "@withyou/shared-types";
import { useAdmin } from "@/components/admin/AdminContext";
import { BrandAvatar } from "@/components/admin/BrandAvatar";
import { BrandLegalSection } from "./BrandLegalSection";
import { BrandProductsSection } from "./BrandProductsSection";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { Toast, useToast } from "@/components/partner/Toast";
import { EmptyState, KpiGrid, LoadError, Panel, Tabs } from "@/components/partner/ui-blocks";
import { adminApi } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";

type Filter = "all" | "mine" | "active" | "review" | "suspended";

const matches = (b: AdminBrandRow, f: Filter, meId?: string) =>
  f === "all" ||
  (f === "mine" && !!meId && b.accountManager?.id === meId) ||
  (f === "active" && b.status === "ACTIVE") ||
  (f === "review" && b.pageStatus === "IN_REVIEW") ||
  (f === "suspended" && b.status === "SUSPENDED");

function StatusOf({ b }: { b: AdminBrandRow }) {
  if (b.status === "SUSPENDED") return <StatusPill tone="danger">Suspendue</StatusPill>;
  if (b.pageStatus === "IN_REVIEW") return <StatusPill tone="info">En validation</StatusPill>;
  if (b.pageStatus === "LIVE") return <StatusPill tone="ok">En ligne</StatusPill>;
  return <StatusPill tone="mute">Page en préparation</StatusPill>;
}

export default function AdminBrandsPage() {
  const { refresh, me } = useAdmin();
  const { data, loading, error, errorMessage, reload, getToken } = usePartnerData((token) => adminApi.brands(token));
  const team = usePartnerData((token) => adminApi.team(token));
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<AdminBrandRow | null>(null);
  const { message, show } = useToast();
  const brands = data ?? [];
  const list = brands.filter((b) => matches(b, filter, me?.id));

  return (
    <>
      <PageHeader
        title="Marques"
        subtitle="Artisans, marques nationales et produits internationaux sélectionnés. Suivez leur catalogue, leurs avis et leur commission."
      />
      <KpiGrid
        items={[
          { label: "Marques actives", value: String(brands.filter((b) => b.status === "ACTIVE").length), note: "objectif : 50 au lancement", tone: "muted" },
          { label: "Pages en ligne", value: String(brands.filter((b) => b.pageStatus === "LIVE").length) },
          { label: "Produits en ligne", value: String(brands.reduce((a, b) => a + b.onlineProducts, 0)) },
          { label: "Suspendues", value: String(brands.filter((b) => b.status === "SUSPENDED").length), tone: "muted" },
        ]}
      />
      <Panel>
        <div className="mb-3.5">
          <Tabs<Filter>
            label="Filtrer les marques"
            value={filter}
            onChange={setFilter}
            items={(
              [
                ["all", "Toutes"],
                ["mine", "Mes marques"],
                ["active", "Actives"],
                ["review", "En validation"],
                ["suspended", "Suspendues"],
              ] as const
            ).map(([key, label]) => ({ key, label, count: brands.filter((b) => matches(b, key, me?.id)).length }))}
          />
        </div>
        {error ? (
          <LoadError what="les marques" message={errorMessage} />
        ) : list.length === 0 ? (
          <EmptyState>{loading ? "Chargement…" : "Aucune marque dans cette catégorie."}</EmptyState>
        ) : (
          <div className="-mx-1.5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[12.5px] text-partner-muted">
                  {["Marque", "Type", "Chargé de compte", "Produits", "Commission", "Note", "Statut", ""].map((h, i) => (
                    <th key={h || i} className={`whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold ${i >= 3 && i <= 5 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((b) => (
                  <tr key={b.id} className="border-b border-partner-border last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="flex min-w-[200px] items-center gap-3">
                        <BrandAvatar name={b.name} logoUrl={b.logoUrl} size={38} />
                        <div>
                          <b className="block leading-tight">{b.name}</b>
                          <span className="text-[12.5px] text-partner-muted">{b.city || b.contact || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{b.type}</td>
                    <td className="px-3 py-3">
                      {b.accountManager ? b.accountManager.name : <span className="text-partner-muted">Non assignée</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {b.onlineProducts} <span className="text-partner-muted">/ {b.products}</span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{b.commissionRate} %</td>
                    <td className="px-3 py-3 text-right tabular-nums">{b.rating ? b.rating.toFixed(1).replace(".", ",") : "—"}</td>
                    <td className="px-3 py-3">
                      <StatusOf b={b} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <PillButton variant="ghost" size="sm" onClick={() => setOpen(b)}>
                        Ouvrir
                      </PillButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {open && (
        <BrandDrawer
          brand={open}
          team={team.data ?? []}
          getToken={getToken}
          onClose={() => setOpen(null)}
          onDone={(toast) => {
            setOpen(null);
            void reload();
            refresh();
            show(toast);
          }}
        />
      )}
      <Toast message={message} />
    </>
  );
}

function BrandDrawer({
  brand,
  team,
  getToken,
  onClose,
  onDone,
}: {
  brand: AdminBrandRow;
  team: AdminTeamMember[];
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onDone: (toast: string) => void;
}) {
  const [commission, setCommission] = useState(String(brand.commissionRate));
  const [manager, setManager] = useState(brand.accountManager?.id ?? "");
  const [applyAll, setApplyAll] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const suspended = brand.status === "SUSPENDED";

  async function send(dto: Parameters<typeof adminApi.updateBrand>[2], toast: string) {
    setErr(null);
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminApi.updateBrand(token, brand.id, dto);
      onDone(toast);
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const c = Number(commission.replace(",", "."));
    if (!(c >= 0 && c <= 40)) {
      setErr("La commission doit être comprise entre 0 et 40 %.");
      return;
    }
    const managerChanged = manager !== (brand.accountManager?.id ?? "");
    const managerName = team.find((t) => t.id === manager);
    void send(
      { commissionRate: c, ...(applyAll ? { applyToProducts: true } : {}), ...(managerChanged ? { accountManagerId: manager || null } : {}) },
      managerChanged
        ? managerName
          ? `${brand.name} est suivie par ${managerName.prenom} ${managerName.nom}.`
          : `${brand.name} n'a plus de chargé de compte.`
        : applyAll
          ? `Commission de ${c} % appliquée à ${brand.name} et à ses ${brand.products} produits.`
          : `Commission par défaut de ${brand.name} : ${c} %.`,
    );
  }

  function toggleSuspension() {
    if (suspended) {
      void send({ status: "ACTIVE" }, `${brand.name} est réactivée.`);
    } else if (!reason.trim()) {
      setErr("Indiquez le motif de la suspension.");
      document.getElementById("breason")?.focus();
    } else {
      void send({ status: "SUSPENDED", suspendedReason: reason.trim() }, `${brand.name} est suspendue.`);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={brand.name}
      subtitle={[brand.type, brand.city].filter(Boolean).join(", ")}
      footer={
        <>
          {err ? (
            <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>
          ) : note ? (
            <span className="mr-auto text-[12.5px] font-semibold text-partner-leaf">{note}</span>
          ) : null}
          <PillButton variant="ghost" disabled={busy} onClick={toggleSuspension}>
            {suspended ? "Réactiver la marque" : "Suspendre la marque"}
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            Enregistrer
          </PillButton>
        </>
      }
    >
      {suspended && brand.suspendedReason && (
        <div role="alert" className="mb-3.5 rounded-2xl bg-partner-dangerBg px-4 py-3.5 text-sm text-partner-danger">
          <b className="block">Motif de suspension</b>
          {brand.suspendedReason}
        </div>
      )}
      <KpiGrid
        columns={3}
        items={[
          { label: "Produits en ligne", value: `${brand.onlineProducts} / ${brand.products}` },
          { label: "Avis clientes", value: String(brand.reviews) },
          { label: "Note moyenne", value: brand.rating ? `${brand.rating.toFixed(1).replace(".", ",")} / 5` : "—" },
        ]}
      />
      <h3 className="mb-3 mt-5 text-[14.5px] font-bold text-partner-heading">Informations</h3>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm max-[700px]:grid-cols-1">
        <div>
          <div className="text-[12.5px] text-partner-muted">Contact</div>
          {brand.contact ?? "—"}
        </div>
        <div>
          <div className="text-[12.5px] text-partner-muted">Page publique</div>
          {brand.pageStatus === "LIVE" ? (
            <a href={`/marque/${brand.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-partner-heading underline">
              /marque/{brand.slug}
            </a>
          ) : (
            <span className="text-partner-muted">Pas encore en ligne</span>
          )}
        </div>
      </div>
      <h3 className="mb-3 mt-5 border-t border-partner-border pt-5 text-[14.5px] font-bold text-partner-heading">Chargé de compte</h3>
      <div className="flex max-w-[360px] flex-col gap-1.5">
        <label htmlFor="bmanager" className="partner-lbl">
          Collaborateur withyou qui suit la marque
        </label>
        <select id="bmanager" value={manager} onChange={(e) => setManager(e.target.value)} className="partner-input">
          <option value="">— Non assignée —</option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>
              {t.prenom} {t.nom} ({t.brands} marque{t.brands > 1 ? "s" : ""} suivie{t.brands > 1 ? "s" : ""})
            </option>
          ))}
        </select>
        <span className="text-[12.5px] text-partner-muted">
          La marque voit son prénom dans son espace, comme contact privilégié. Pris en compte avec « Enregistrer ».
        </span>
      </div>
      <BrandLegalSection marqueId={brand.id} getToken={getToken} />
      <h3 className="mb-3 mt-5 border-t border-partner-border pt-5 text-[14.5px] font-bold text-partner-heading">Commission par défaut</h3>
      <div className="flex max-w-[420px] flex-col gap-1.5">
        <label htmlFor="bcom" className="partner-lbl">
          Commission des nouveaux produits (%)
        </label>
        <input id="bcom" type="number" min={0} max={40} step={0.5} value={commission} onChange={(e) => setCommission(e.target.value)} className="partner-input w-[160px]" />
        <span className="text-[12.5px] text-partner-muted">
          Donnée à chaque nouveau produit de la marque. Chaque produit peut ensuite avoir la sienne, ci-dessous.
        </span>
        {brand.products > 0 && (
          <label className="mt-1 flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
            Appliquer aussi aux {brand.products} produit{brand.products > 1 ? "s" : ""} existant{brand.products > 1 ? "s" : ""} (avec « Enregistrer »)
          </label>
        )}
      </div>
      <BrandProductsSection marqueId={brand.id} getToken={getToken} reloadKey={0} onSaved={setNote} />
      {!suspended && (
        <>
          <h3 className="mb-3 mt-5 border-t border-partner-border pt-5 text-[14.5px] font-bold text-partner-heading">Suspension</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="breason" className="partner-lbl">
              Motif (obligatoire pour suspendre)
            </label>
            <input id="breason" type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. documents d'importation expirés" className="partner-input" />
          </div>
        </>
      )}
    </Drawer>
  );
}
