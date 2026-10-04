"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import type { AdminBrandProduct } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill, type StatusTone } from "@/components/partner/StatusPill";
import { adminApi } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";

type GetToken = () => Promise<string | null>;

const STATUT: Record<AdminBrandProduct["statut"], [StatusTone, string]> = {
  ONLINE: ["ok", "En ligne"],
  IN_REVIEW: ["info", "En validation"],
  DRAFT: ["mute", "Brouillon"],
  REJECTED: ["danger", "Refusé"],
};

/**
 * Produits de la marque dans son panneau : chaque produit a sa propre commission,
 * modifiable ici (s'applique aux prochaines commandes).
 */
export function BrandProductsSection({
  marqueId,
  getToken,
  reloadKey,
  onSaved,
}: {
  marqueId: string;
  getToken: GetToken;
  /** Change quand la commission de la marque a été appliquée à tous ses produits. */
  reloadKey: number;
  onSaved: (toast: string) => void;
}) {
  const [items, setItems] = useState<AdminBrandProduct[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const list = await adminApi.brandProducts(token, marqueId);
        setItems(list);
        setDraft(Object.fromEntries(list.map((p) => [p.id, String(p.commission)])));
      } catch (e) {
        setErr(apiErrorMessage(e, "Impossible de charger les produits."));
      }
    })();
  }, [getToken, marqueId, reloadKey]);

  async function save(p: AdminBrandProduct) {
    setErr(null);
    const value = Number((draft[p.id] ?? "").replace(",", "."));
    if (!(value >= 0 && value <= 40)) return setErr("La commission doit être comprise entre 0 et 40 %.");
    const token = await getToken();
    if (!token) return;
    setBusyId(p.id);
    try {
      await adminApi.setProductCommission(token, p.id, value);
      setItems((cur) => cur?.map((x) => (x.id === p.id ? { ...x, commission: value } : x)) ?? null);
      onSaved(`Commission de « ${p.nom} » : ${value} %.`);
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <h3 className="mb-3 mt-5 flex items-center gap-2 border-t border-partner-border pt-5 text-[14.5px] font-bold text-partner-heading">
        <Package className="h-4 w-4" aria-hidden="true" />
        Produits {items ? `(${items.length})` : ""}
      </h3>
      {err && <p className="mb-2 text-[12.5px] font-semibold text-partner-danger">{err}</p>}
      {!items ? (
        <p className="text-sm text-partner-muted">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-partner-muted">Cette marque n&apos;a encore ajouté aucun produit.</p>
      ) : (
        <div className="-mx-1.5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[12.5px] text-partner-muted">
                {["Produit", "Statut", "Prix", "Ventes 30 j", "Commission", "Gain withyou"].map((h, i) => (
                  <th key={h} className={`whitespace-nowrap border-b border-partner-border px-2 py-2 font-semibold ${i >= 2 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const [tone, label] = STATUT[p.statut];
                const edited = (draft[p.id] ?? "") !== String(p.commission);
                const rate = Number((draft[p.id] ?? "").replace(",", ".")) || 0;
                return (
                  <tr key={p.id} className="border-b border-partner-border last:border-b-0">
                    <td className="px-2 py-2.5">
                      <div className="flex min-w-[200px] items-center gap-2.5">
                        <div className="h-10 w-10 flex-none overflow-hidden rounded-lg bg-partner-bg">
                          {p.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <b className="line-clamp-2 block leading-tight">{p.nom}</b>
                          <span className="text-[12px] text-partner-muted">
                            {p.categorie ?? "Sans catégorie"} · stock {p.stock}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <StatusPill tone={tone}>{label}</StatusPill>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">{formatPrice(p.prix)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{p.ventes30j}</td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          step={0.5}
                          value={draft[p.id] ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          aria-label={`Commission sur ${p.nom} (%)`}
                          className="partner-input w-[74px] min-h-9 px-2 py-1 text-right text-sm"
                        />
                        <span className="text-partner-muted">%</span>
                        {edited && (
                          <PillButton size="sm" disabled={busyId === p.id} onClick={() => save(p)}>
                            OK
                          </PillButton>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-partner-muted">
                      {formatPrice(Math.round((p.prix * rate) / 100))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12.5px] text-partner-muted">
        La commission d&apos;un produit s&apos;applique à ses prochaines commandes ; les commandes passées gardent la leur.
      </p>
    </>
  );
}
