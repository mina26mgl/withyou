"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Package, Plus, Search } from "lucide-react";
import type { Categorie, Produit } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { ProductVisual } from "@/components/partner/ProductVisual";
import { StatusPill } from "@/components/partner/StatusPill";
import { FitBar } from "@/components/partner/FitBar";
import { Toast, useToast } from "@/components/partner/Toast";
import { LoadError } from "@/components/partner/ui-blocks";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";
import { STATUS_PILL, displayStatus } from "@/lib/partnerFormat";
import { STATUS_TABS, type StatusTabKey } from "./constants";
import { ProductDrawer } from "./ProductDrawer";

export default function ProduitsPage() {
  const { getToken, isLoaded } = useAuth();
  const [products, setProducts] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<StatusTabKey>("all");
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newIsPack, setNewIsPack] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { message, show } = useToast();

  const handledQuery = useRef(false);

  async function reload() {
    const token = await getToken();
    if (!token) return;
    const [list, cats] = await Promise.all([partnerApi.listProducts(token), partnerApi.listCategories()]);
    setProducts(list);
    setCategories(cats);
  }

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        await reload();
        openFromQuery();
      } catch (err) {
        setLoadError(apiErrorMessage(err, "Le serveur ne répond pas. Vérifiez que l'API est démarrée."));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  function openFromQuery() {
    if (handledQuery.current) return;
    handledQuery.current = true;
    const params = new URLSearchParams(window.location.search);
    const edit = params.get("edit");
    if (edit) {
      setEditingId(edit);
      setDrawerOpen(true);
    } else if (params.get("new") === "1") {
      setEditingId(null);
      setDrawerOpen(true);
    }
  }

  const counts = useMemo(() => {
    const c: Record<StatusTabKey, number> = { all: products.length, ONLINE: 0, OUT_OF_STOCK: 0, IN_REVIEW: 0, DRAFT: 0 };
    for (const p of products) {
      const s = displayStatus(p);
      if (s !== "REJECTED") c[s]++;
    }
    return c;
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesTab = tab === "all" || displayStatus(p) === tab;
      const matchesQuery = !q || p.nom.toLowerCase().includes(q) || (p.categorieNom ?? "").toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [products, tab, query]);

  function openNew(pack = false) {
    setEditingId(null);
    setNewIsPack(pack);
    setDrawerOpen(true);
  }

  // Un pack se compose d'au moins 2 produits simples de la marque.
  const simpleProducts = products.filter((p) => !p.isPack).length;

  function openEdit(id: string) {
    setEditingId(id);
    setDrawerOpen(true);
  }

  function handleSaved(msg: string) {
    setDrawerOpen(false);
    show(msg);
    reload();
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Produits"
        subtitle="Chaque produit est vérifié par l'équipe withyou avant sa mise en ligne, en général sous 48 h. withyou s'occupe ensuite des commandes, du paiement et de la livraison dans les 58 wilayas. Plus la fiche est complète, mieux l'IA le recommande aux bonnes peaux."
        actions={
          <>
            <PillButton
              variant="ghost"
              onClick={() => openNew(true)}
              disabled={simpleProducts < 2}
              title={simpleProducts < 2 ? "Ajoutez d'abord au moins 2 produits" : undefined}
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              Créer un pack
            </PillButton>
            <PillButton onClick={() => openNew()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Ajouter un produit
            </PillButton>
          </>
        }
      />

      <section className="rounded-[22px] border border-partner-border bg-partner-card p-[22px]">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className="min-h-11 rounded-full border border-partner-border bg-partner-card px-3.5 py-1.5 text-[13.5px] font-medium text-partner-muted hover:text-partner-ink aria-selected:border-[#B9D8E4] aria-selected:bg-partner-soft aria-selected:font-semibold aria-selected:text-partner-heading"
              >
                {t.label} <small className="opacity-75">{counts[t.key]}</small>
              </button>
            ))}
          </div>
          <div className="relative min-w-[240px] flex-1 max-[560px]:min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-partner-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit"
              aria-label="Rechercher un produit"
              className="partner-input pl-9"
            />
          </div>
        </div>

        {loadError ? (
          <LoadError what="vos produits" message={loadError} />
        ) : loading ? (
          <p className="py-16 text-center text-partner-muted">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="py-9 text-center text-partner-muted">Aucun produit ne correspond. Essayez un autre filtre ou ajoutez un produit.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto min-[640px]:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>Produit</Th>
                    <Th align="right">Prix</Th>
                    <Th align="right">Stock</Th>
                    <Th align="right">Ventes 30 j</Th>
                    <Th>Adapté</Th>
                    <Th>Statut</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const status = STATUS_PILL[displayStatus(p)];
                    return (
                      <tr key={p.id} className="border-b border-partner-border last:border-0">
                        <Td>
                          <div className="flex min-w-[250px] items-center gap-3">
                            <Thumb url={p.imagesUrls[0]} category={p.categorieNom} name={p.nom} />
                            <div>
                              <b className="block font-semibold leading-tight">{p.nom}</b>
                              <span className="text-[12.5px] text-partner-muted">
                                {p.isPack ? <PackBadge count={p.packItems?.length ?? 0} /> : p.categorieNom}
                              </span>
                            </div>
                          </div>
                        </Td>
                        <Td align="right">{formatPrice(p.prix)}</Td>
                        <Td align="right" className={p.stock === 0 ? "font-semibold text-partner-danger" : undefined}>
                          {p.stock}
                        </Td>
                        <Td align="right">{p.ventes30j ?? 0}</Td>
                        <Td>
                          <FitBar value={p.fitScore} />
                        </Td>
                        <Td>
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </Td>
                        <Td align="right">
                          <PillButton variant="ghost" size="sm" onClick={() => openEdit(p.id)}>
                            Modifier
                          </PillButton>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 min-[640px]:hidden">
              {filtered.map((p) => {
                const status = STATUS_PILL[displayStatus(p)];
                return (
                  <div key={p.id} className="rounded-2xl border border-partner-border p-3">
                    <div className="flex items-center gap-3">
                      <Thumb url={p.imagesUrls[0]} category={p.categorieNom} name={p.nom} />
                      <div className="min-w-0 flex-1">
                        <b className="block truncate font-semibold leading-tight">{p.nom}</b>
                        <span className="text-[12.5px] text-partner-muted">
                          {p.isPack ? <PackBadge count={p.packItems?.length ?? 0} /> : p.categorieNom}
                        </span>
                      </div>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold">{formatPrice(p.prix)}</span>
                      <span className={p.stock === 0 ? "font-semibold text-partner-danger" : "text-partner-muted"}>Stock : {p.stock}</span>
                      <FitBar value={p.fitScore} />
                    </div>
                    <PillButton variant="ghost" size="sm" className="mt-2.5 w-full" onClick={() => openEdit(p.id)}>
                      Modifier
                    </PillButton>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <ProductDrawer
        open={drawerOpen}
        productId={editingId}
        newIsPack={newIsPack}
        products={products}
        categories={categories}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
      <Toast message={message} />
    </div>
  );
}

function PackBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-partner-heading">
      <Package className="h-3.5 w-3.5" aria-hidden="true" />
      Pack · {count} produits
    </span>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th className={`whitespace-nowrap border-b border-partner-border px-3 py-2.5 text-[12.5px] font-semibold text-partner-muted ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, align, className }: { children: React.ReactNode; align?: "right"; className?: string }) {
  return (
    <td className={`border-b border-partner-border px-3 py-3 align-middle ${align === "right" ? "text-right tabular-nums" : ""} ${className ?? ""}`}>
      {children}
    </td>
  );
}

function Thumb({ url, category, name }: { url?: string; category?: string | null; name: string }) {
  return (
    <div className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-partner-bg">
      <ProductVisual imageUrl={url} category={category} name={name} />
    </div>
  );
}
