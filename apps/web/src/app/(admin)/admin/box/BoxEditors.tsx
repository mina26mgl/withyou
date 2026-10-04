"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AdminBoxDetail, AdminBoxInput, AdminBoxItem, AdminCatalogProduct } from "@withyou/shared-types";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PillButton } from "@/components/partner/PillButton";
import { adminApi } from "@/lib/adminApi";
import { apiErrorMessage } from "@/lib/partnerApi";

type GetToken = () => Promise<string | null>;

const DEFAULT_VARIANTS = ["Peau mixte", "Peau sèche", "Peau grasse", "Peau sensible"];
const STATUTS: [AdminBoxDetail["statut"], string][] = [
  ["PREPARATION", "En préparation"],
  ["ASSEMBLEE", "Assemblée"],
  ["EXPEDIEE", "Expédiée"],
];

/** « 2026-11 » → « Box Rituel de novembre » (« d'octobre », « d'avril »…). */
function defaultName(mois: string) {
  const m = new Date(`${mois}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long" });
  return `Box Rituel ${/^[aeiouyéè]/i.test(m) ? "d'" : "de "}${m}`;
}
/** Assemblage le 28 du mois précédent, expédition le 1er du mois. */
function defaultDates(mois: string) {
  const [y, m] = mois.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 28));
  return { assemblage: prev.toISOString().slice(0, 10), expedition: `${mois}-01` };
}
function nextMonth(from?: string) {
  const d = from ? new Date(`${from}T12:00:00`) : new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 7);
}

/* ------------------------------------------------------------------ */
/* Créer / modifier une box                                            */
/* ------------------------------------------------------------------ */

export function BoxDrawer({
  box,
  latest,
  getToken,
  onClose,
  onSaved,
}: {
  /** null = création. */
  box: AdminBoxDetail | null;
  /** Box la plus récente : sert de modèle (mois suivant, abonnées) à la création. */
  latest: AdminBoxDetail | null;
  getToken: GetToken;
  onClose: () => void;
  onSaved: (toast: string, id: string) => void;
}) {
  const startMonth = box ? box.mois.slice(0, 7) : nextMonth(latest?.mois);
  const [mois, setMois] = useState(startMonth);
  const [nom, setNom] = useState(box?.nom ?? defaultName(startMonth));
  const [nomTouched, setNomTouched] = useState(!!box);
  const [assemblage, setAssemblage] = useState(box?.dateAssemblage ?? defaultDates(startMonth).assemblage);
  const [expedition, setExpedition] = useState(box?.dateExpedition ?? defaultDates(startMonth).expedition);
  const [statut, setStatut] = useState(box?.statut ?? "PREPARATION");
  const [variantes, setVariantes] = useState(
    (box?.variantes ?? latest?.variantes ?? DEFAULT_VARIANTS.map((typePeau) => ({ typePeau, abonnees: 0 }))).map((v) => ({
      typePeau: v.typePeau,
      abonnees: String(v.abonnees),
    })),
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function changeMonth(m: string) {
    setMois(m);
    if (!m) return;
    const d = defaultDates(m);
    setAssemblage(d.assemblage);
    setExpedition(d.expedition);
    if (!nomTouched) setNom(defaultName(m));
  }

  async function save() {
    setErr(null);
    if (!box && !/^\d{4}-\d{2}$/.test(mois)) return setErr("Choisissez le mois de la box.");
    if (nom.trim().length < 2) return setErr("Indiquez le nom de la box.");
    const vs = variantes.filter((v) => v.typePeau.trim());
    if (!vs.length) return setErr("Ajoutez au moins une variante.");
    if (vs.some((v) => !(Number(v.abonnees) >= 0))) return setErr("Le nombre d'abonnées doit être un nombre positif.");
    const dto: AdminBoxInput = {
      ...(box ? { statut } : { mois }),
      nom: nom.trim(),
      dateAssemblage: assemblage,
      dateExpedition: expedition,
      variantes: vs.map((v) => ({ typePeau: v.typePeau.trim(), abonnees: Math.round(Number(v.abonnees)) })),
    };
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      if (box) {
        await adminApi.updateBox(token, box.id, dto);
        onSaved(`${dto.nom} est mise à jour.`, box.id);
      } else {
        const { id } = await adminApi.createBox(token, dto);
        onSaved(`${dto.nom} est créée. Ajoutez maintenant ses produits.`, id);
      }
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  const total = variantes.reduce((a, v) => a + (Number(v.abonnees) || 0), 0);

  return (
    <Drawer
      open
      onClose={onClose}
      title={box ? `Modifier ${box.nom}` : "Créer une box"}
      subtitle="Une variante par type de peau. Les quantités à réunir se calculent d'après les abonnées de chaque variante."
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton disabled={busy} onClick={save}>
            {box ? "Enregistrer" : "Créer la box"}
          </PillButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Mois</span>
          <input type="month" value={mois} disabled={!!box} onChange={(e) => changeMonth(e.target.value)} className="partner-input disabled:opacity-60" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Nom</span>
          <input
            type="text"
            maxLength={80}
            value={nom}
            onChange={(e) => {
              setNom(e.target.value);
              setNomTouched(true);
            }}
            className="partner-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Assemblage</span>
          <input type="date" value={assemblage} onChange={(e) => setAssemblage(e.target.value)} className="partner-input" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Expédition à partir du</span>
          <input type="date" value={expedition} onChange={(e) => setExpedition(e.target.value)} className="partner-input" />
        </label>
      </div>

      {box && (
        <div className="mt-3.5 flex flex-col gap-1.5">
          <span className="partner-lbl">Statut</span>
          <div className="flex flex-wrap gap-2">
            {STATUTS.map(([k, l]) => (
              <Chip key={k} pressed={statut === k} onClick={() => setStatut(k)}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="partner-lbl">Variantes et abonnées</span>
          <span className="text-[12.5px] text-partner-muted">{total.toLocaleString("fr-FR")} abonnées au total</span>
        </div>
        <div className="flex flex-col gap-2">
          {variantes.map((v, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_130px_auto] items-center gap-2">
              <input
                type="text"
                maxLength={40}
                value={v.typePeau}
                onChange={(e) => setVariantes((cur) => cur.map((x, j) => (j === i ? { ...x, typePeau: e.target.value } : x)))}
                aria-label="Type de peau"
                className="partner-input"
              />
              <input
                type="number"
                min={0}
                value={v.abonnees}
                onChange={(e) => setVariantes((cur) => cur.map((x, j) => (j === i ? { ...x, abonnees: e.target.value } : x)))}
                aria-label={`Abonnées ${v.typePeau}`}
                className="partner-input text-right tabular-nums"
              />
              <button
                type="button"
                onClick={() => setVariantes((cur) => cur.filter((_, j) => j !== i))}
                aria-label={`Retirer ${v.typePeau}`}
                className="grid h-10 w-10 place-items-center rounded-full border border-partner-border bg-partner-card text-partner-muted hover:border-partner-danger hover:text-partner-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <PillButton variant="ghost" size="sm" className="mt-2" onClick={() => setVariantes((cur) => [...cur, { typePeau: "", abonnees: "0" }])}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Ajouter une variante
        </PillButton>
        {!box && latest && (
          <p className="mt-2 text-[12.5px] text-partner-muted">Abonnées reprises de {latest.nom}, à ajuster.</p>
        )}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Ajouter / modifier un produit de la box                             */
/* ------------------------------------------------------------------ */

export function BoxItemDrawer({
  box,
  item,
  getToken,
  onClose,
  onSaved,
}: {
  box: AdminBoxDetail;
  /** null = ajout. */
  item: AdminBoxItem | null;
  getToken: GetToken;
  onClose: () => void;
  onSaved: (toast: string) => void;
}) {
  const [catalogue, setCatalogue] = useState<AdminCatalogProduct[] | null>(null);
  const [source, setSource] = useState<"catalogue" | "libre">(item && !item.idProduit ? "libre" : "catalogue");
  const [idProduit, setIdProduit] = useState(item?.idProduit ?? "");
  const [nom, setNom] = useState(item?.nom ?? "");
  const [marque, setMarque] = useState(item?.marque ?? "");
  const [variantes, setVariantes] = useState<string[]>(item?.variantes ?? box.variantes.map((v) => v.typePeau));
  const [confirme, setConfirme] = useState(item ? String(item.confirme) : "");
  const [repondu, setRepondu] = useState(item ? item.etat !== "ATTENTE" : false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (item) return;
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const list = await adminApi.boxCatalogue(token);
        setCatalogue(list);
        if (!list.length) setSource("libre");
      } catch {
        setCatalogue([]);
        setSource("libre");
      }
    })();
  }, [getToken, item]);

  const besoin = box.variantes.filter((v) => variantes.includes(v.typePeau)).reduce((a, v) => a + v.abonnees, 0);
  const toggle = (t: string) => setVariantes((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function save() {
    setErr(null);
    if (!variantes.length) return setErr("Choisissez au moins une variante.");
    if (!item && source === "catalogue" && !idProduit) return setErr("Choisissez un produit du catalogue.");
    if ((item ? !item.idProduit : source === "libre") && (nom.trim().length < 2 || marque.trim().length < 2)) {
      return setErr("Indiquez le produit et sa marque.");
    }
    const q = confirme.trim() ? Math.round(Number(confirme)) : undefined;
    if (q !== undefined && !(q >= 0)) return setErr("Quantité confirmée invalide.");
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      const common = {
        variantes,
        ...(q !== undefined ? { quantiteConfirmee: q } : {}),
        // Une quantité saisie vaut réponse de la marque.
        marqueARepondu: repondu || q !== undefined,
      };
      if (item) {
        await adminApi.updateBoxItem(token, item.id, { ...common, ...(item.idProduit ? {} : { nom: nom.trim(), marque: marque.trim() }) });
        onSaved(`${item.nom} est mis à jour.`);
      } else {
        await adminApi.addBoxItem(
          token,
          box.id,
          source === "catalogue" ? { ...common, idProduit } : { ...common, nom: nom.trim(), marque: marque.trim() },
        );
        onSaved("Produit ajouté à la box.");
      }
    } catch (e) {
      setErr(apiErrorMessage(e, "L'enregistrement a échoué."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    const token = await getToken();
    if (!token) return;
    setBusy(true);
    try {
      await adminApi.removeBoxItem(token, item.id);
      onSaved(`${item.nom} est retiré de la box.`);
    } catch (e) {
      setErr(apiErrorMessage(e, "Le retrait a échoué."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={item ? item.nom : "Ajouter un produit"}
      subtitle={item ? `${item.marque} · ${box.nom}` : box.nom}
      footer={
        <>
          {err && <span className="mr-auto text-[12.5px] font-semibold text-partner-danger">{err}</span>}
          {item && (
            <PillButton variant="ghost" disabled={busy} onClick={remove}>
              Retirer de la box
            </PillButton>
          )}
          <PillButton disabled={busy} onClick={save}>
            {item ? "Enregistrer" : "Ajouter"}
          </PillButton>
        </>
      }
    >
      {!item && (
        <div className="mb-3.5 flex flex-wrap gap-2">
          <Chip pressed={source === "catalogue"} onClick={() => setSource("catalogue")} disabled={catalogue?.length === 0}>
            Produit du catalogue
          </Chip>
          <Chip pressed={source === "libre"} onClick={() => setSource("libre")}>
            Autre produit
          </Chip>
        </div>
      )}

      {!item && source === "catalogue" ? (
        <label className="flex flex-col gap-1.5">
          <span className="partner-lbl">Produit</span>
          <select value={idProduit} onChange={(e) => setIdProduit(e.target.value)} className="partner-input">
            <option value="">{catalogue ? "— Choisir —" : "Chargement…"}</option>
            {catalogue?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} — {p.marque}
                {p.statut !== "ONLINE" ? " (en validation)" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (item ? !item.idProduit : true) ? (
        <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Produit</span>
            <input type="text" maxLength={160} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Huile de figue de barbarie, mini 10 ml" className="partner-input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="partner-lbl">Marque</span>
            <input type="text" maxLength={80} value={marque} onChange={(e) => setMarque(e.target.value)} className="partner-input" />
          </label>
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-col gap-1.5">
        <span className="partner-lbl">Variantes qui reçoivent ce produit</span>
        <div className="flex flex-wrap gap-2">
          {box.variantes.map((v) => (
            <Chip key={v.typePeau} pressed={variantes.includes(v.typePeau)} onClick={() => toggle(v.typePeau)}>
              {v.typePeau} · {v.abonnees}
            </Chip>
          ))}
        </div>
        <span className="text-[13px] text-partner-heading">
          Quantité nécessaire : <b className="tabular-nums">{besoin.toLocaleString("fr-FR")}</b> unités
        </span>
      </div>

      <div className="mt-3.5 flex max-w-[360px] flex-col gap-1.5">
        <label htmlFor="bconf" className="partner-lbl">
          Quantité confirmée par la marque
        </label>
        <input
          id="bconf"
          type="number"
          min={0}
          value={confirme}
          onChange={(e) => setConfirme(e.target.value)}
          placeholder="Pas encore de réponse"
          className="partner-input tabular-nums"
        />
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={repondu} onChange={(e) => setRepondu(e.target.checked)} className="h-[18px] w-[18px] accent-[#3A9A5E]" />
          La marque a répondu
        </label>
        <span className="text-[12.5px] text-partner-muted">Sans réponse, le produit reste « Sans réponse » et peut être relancé.</span>
      </div>
    </Drawer>
  );
}
