"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Search } from "lucide-react";
import { ORDER_STEPS, type AdminIncidentType, type AdminOrderDetail, type AdminOrderRow } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { Drawer } from "@/components/partner/Drawer";
import { PageHeader } from "@/components/partner/PageHeader";
import { PillButton } from "@/components/partner/PillButton";
import { StatusPill } from "@/components/partner/StatusPill";
import { EmptyState, KpiGrid, LoadError, Panel, Tabs } from "@/components/partner/ui-blocks";
import { adminApi, sinceLabel } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";
import { usePartnerData } from "@/lib/usePartnerData";
import { cn } from "@/lib/utils";

/** Action proposée pour débloquer, comme dans le prototype. */
const INCIDENT_ACTION: Record<AdminIncidentType, string> = {
  BRAND: "Relancer la marque",
  CLIENT: "Reprogrammer la livraison",
  PAYMENT: "Vérifier le paiement",
  QUALITY: "Suivre le remplacement",
  CARRIER: "Ouvrir un ticket transporteur",
};

type Filter = "all" | "blocked" | "0" | "1" | "2" | "3" | "4";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "blocked", label: "Bloquées" },
  { key: "0", label: "Confirmées" },
  { key: "1", label: "Collecte" },
  { key: "2", label: "Emballage" },
  { key: "3", label: "Chez le livreur" },
  { key: "4", label: "Livrées" },
];

const matches = (o: AdminOrderRow, f: Filter) => f === "all" || (f === "blocked" ? !!o.block : String(o.step) === f);

/** État de chaque étape : faite, en cours, ou bloquée (en rouge). */
function stepState(o: AdminOrderRow, i: number): "done" | "cur" | "block" | "" {
  if (i < o.step || o.step === 4) return "done";
  if (i === o.step) return o.block ? "block" : "cur";
  return "";
}
const STEP_COLOR = { done: "bg-partner-leaf", cur: "bg-[#7FB8CF]", block: "bg-partner-danger", "": "bg-partner-border" };

function Rail({ order }: { order: AdminOrderRow }) {
  return (
    <div className="grid w-[150px] grid-cols-5 gap-1" aria-hidden="true">
      {ORDER_STEPS.map((s, i) => (
        <i key={s} className={cn("h-1.5 rounded", STEP_COLOR[stepState(order, i)])} />
      ))}
    </div>
  );
}

function RailLarge({ order }: { order: AdminOrderRow }) {
  return (
    <div className="mb-1.5 mt-1 grid grid-cols-5 gap-2">
      {ORDER_STEPS.map((s, i) => {
        const st = stepState(order, i);
        return (
          <div key={s}>
            <i className={cn("mb-2 block h-2 rounded-[5px]", STEP_COLOR[st])} />
            <span className={cn("block text-xs leading-tight text-partner-muted", (st === "cur" || st === "block") && "font-semibold text-partner-ink")}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOrdersPage() {
  const { data, loading, error, errorMessage, getToken } = usePartnerData((token) => adminApi.orders(token));
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const orders = useMemo(() => data ?? [], [data]);

  // Lien « Ouvrir » depuis la vue du jour : /admin/commandes#<id>
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash || !data) return;
    if (data.some((o) => o.id === hash)) setOpenId(hash);
    history.replaceState(null, "", window.location.pathname);
  }, [data]);

  const q = query.trim().toLowerCase();
  const list = orders.filter(
    (o) => matches(o, filter) && (!q || [o.code, o.client, o.wilaya, ...o.brands].join(" ").toLowerCase().includes(q)),
  );
  const count = (f: Filter) => orders.filter((o) => matches(o, f)).length;
  const weekAgo = Date.now() - 7 * 86_400_000;

  return (
    <>
      <PageHeader
        title="Commandes"
        subtitle="Chaque commande peut réunir plusieurs marques. La barre montre où elle en est, et en rouge l'étape qui bloque."
      />
      <KpiGrid
        items={[
          { label: "En cours", value: String(orders.filter((o) => o.step < 4).length) },
          { label: "Bloquées", value: String(count("blocked")), note: count("blocked") ? "à traiter en priorité" : undefined, tone: "down" },
          { label: "En collecte chez les marques", value: String(count("1")) },
          {
            label: "Livrées cette semaine",
            value: String(orders.filter((o) => o.step === 4 && o.createdAt && new Date(o.createdAt).getTime() > weekAgo).length),
          },
        ]}
      />
      <Panel>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <Tabs<Filter> label="Filtrer les commandes" value={filter} onChange={setFilter} items={FILTERS.map((f) => ({ ...f, count: count(f.key) }))} />
          <div className="relative min-w-[240px] max-[560px]:min-w-0 max-[560px]:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-partner-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="N°, cliente, wilaya, marque"
              aria-label="Rechercher une commande"
              className="partner-input pl-9"
            />
          </div>
        </div>
        {error ? (
          <LoadError what="les commandes" message={errorMessage} />
        ) : list.length === 0 ? (
          <EmptyState>{loading ? "Chargement…" : "Aucune commande ne correspond."}</EmptyState>
        ) : (
          <div className="-mx-1.5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[12.5px] text-partner-muted">
                  {["Commande", "Cliente", "Marques", "Montant", "Paiement", "Avancement", ""].map((h, i) => (
                    <th key={h || i} className={cn("whitespace-nowrap border-b border-partner-border px-3 py-2.5 font-semibold", i === 3 && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="border-b border-partner-border last:border-b-0">
                    <td className="px-3 py-3">
                      <b>{o.code}</b>
                      <div className="text-[12.5px] text-partner-muted">{sinceLabel(o.createdAt)}</div>
                    </td>
                    <td className="px-3 py-3">
                      {o.client ?? "—"}
                      <div className="text-[12.5px] text-partner-muted">{o.wilaya}</div>
                    </td>
                    <td className="px-3 py-3">{o.brands.join(", ")}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{formatPrice(o.total)}</td>
                    <td className="px-3 py-3">{o.payment}</td>
                    <td className="px-3 py-3">
                      <Rail order={o} />
                      <div className={cn("mt-[5px] max-w-[260px] text-[12.5px] leading-snug", o.block ? "font-semibold text-partner-danger" : "text-partner-muted")}>
                        {o.block ? o.block.reason : ORDER_STEPS[o.step]}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <PillButton variant="ghost" size="sm" onClick={() => setOpenId(o.id)}>
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

      {openId && <OrderDrawer id={openId} getToken={getToken} onClose={() => setOpenId(null)} />}
    </>
  );
}

function OrderDrawer({ id, getToken, onClose }: { id: string; getToken: () => Promise<string | null>; onClose: () => void }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        setOrder(await adminApi.order(token, id));
      } catch (e) {
        setErr(apiErrorMessage(e, "Impossible de charger la commande."));
      }
    })();
  }, [getToken, id]);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <Drawer
      open
      onClose={onClose}
      title={order ? `Commande ${order.code}` : "Commande"}
      subtitle={order ? `${order.brandItems.length} marque${order.brandItems.length > 1 ? "s" : ""}, ${formatPrice(order.total)}` : undefined}
    >
      {err ? (
        <LoadError what="la commande" message={err} />
      ) : !order ? (
        <p className="text-partner-muted">Chargement de la commande…</p>
      ) : (
        <>
          <RailLarge order={order} />

          {order.block && (
            <div role="alert" className="my-3.5 flex gap-3 rounded-2xl bg-partner-dangerBg px-4 py-3.5 text-sm text-partner-danger">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <div>
                <b className="block">Bloquée : {ORDER_STEPS[order.step].toLowerCase()}</b>
                {order.block.reason}
                <div className="mt-2.5 text-[12.5px] font-semibold">
                  Action à mener : {INCIDENT_ACTION[order.block.type]}
                </div>
              </div>
            </div>
          )}

          <Section title="Articles par marque">
            {order.brandItems.map((b) => (
              <div key={b.brand} className="mb-2.5 rounded-[14px] border border-partner-border px-3.5 py-3">
                <div className="flex items-center justify-between gap-2.5">
                  <b>{b.brand}</b>
                  {b.received || order.step >= 2 ? <StatusPill tone="ok">Reçu</StatusPill> : <StatusPill tone="warn">À collecter</StatusPill>}
                </div>
                <ul className="mb-0 mt-1.5 pl-[18px] text-[13.5px] text-partner-muted">
                  {b.items.map((it) => (
                    <li key={it.nom}>
                      {it.quantite > 1 ? `${it.quantite} × ` : ""}
                      {it.nom}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section title="Cliente et paiement">
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm max-[700px]:grid-cols-1">
              <Info k="Cliente" v={order.client ?? "—"} />
              <Info k="Wilaya" v={`${order.wilaya}${order.commune ? `, ${order.commune}` : ""}`} />
              <Info k="Téléphone" v={order.phone ?? "—"} />
              <Info
                k="Paiement"
                v={`${order.payment}, ${formatPrice(order.total)}${order.paymentStatus === "confirme" ? " (payé)" : order.paymentStatus ? " (en attente)" : ""}`}
              />
            </div>
          </Section>

          <Section title="Livraison">
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm max-[700px]:grid-cols-1">
              <Info k="Transporteur" v={order.carrier ?? "Pas encore attribué"} />
              <Info k="Adresse" v={order.address} />
            </div>
          </Section>

          <Section title="Historique">
            <ul className="m-0 list-none border-l-2 border-partner-border py-0 pl-3.5">
              {order.timeline.map((t, i) => (
                <li key={i} className="relative pb-3.5 pl-3.5 text-[13.5px]">
                  <span
                    className={cn(
                      "absolute left-[-21px] top-[5px] h-2.5 w-2.5 rounded-full border-2 border-partner-card",
                      t.bad ? "bg-partner-danger" : "bg-partner-leaf",
                    )}
                  />
                  {t.label}
                  <span className="block text-xs text-partner-muted">{fmtDate(t.at)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 border-t border-partner-border pt-[18px] first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-3 mt-1 text-[14.5px] font-bold text-partner-heading">{title}</div>
      {children}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[12.5px] text-partner-muted">{k}</div>
      {v}
    </div>
  );
}
