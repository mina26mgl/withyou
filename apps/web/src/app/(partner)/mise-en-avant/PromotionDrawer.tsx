"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Produit } from "@withyou/shared-types";
import { Chip } from "@/components/partner/Chip";
import { Drawer } from "@/components/partner/Drawer";
import { PillButton } from "@/components/partner/PillButton";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";
import { todayIso } from "@/lib/partnerFormat";

export function PromotionDrawer({
  open,
  products,
  onClose,
  onCreated,
}: {
  open: boolean;
  products: Produit[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { getToken } = useAuth();
  const [nom, setNom] = useState("");
  const [reduction, setReduction] = useState<number | "">(15);
  const [debut, setDebut] = useState(todayIso());
  const [fin, setFin] = useState(todayIso(14));
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNom("");
    setReduction(15);
    setDebut(todayIso());
    setFin(todayIso(14));
    setSelected([]);
    setError("");
  }, [open]);

  const online = products.filter((p) => p.statut === "ONLINE");

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (!nom.trim()) return setError("Donnez un nom à la promotion.");
    if (!selected.length) return setError("Choisissez au moins un produit.");
    const off = Number(reduction);
    if (!(off >= 5 && off <= 50)) return setError("La réduction doit être entre 5 et 50 %.");
    if (!debut || !fin || fin < debut) return setError("La date de fin doit suivre la date de début.");

    const token = await getToken();
    if (!token) return;
    setError("");
    setSaving(true);
    try {
      await partnerApi.createPromotion(token, { nom, reduction: off, dateDebut: debut, dateFin: fin, produitIds: selected });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err, "La promotion n'a pas pu être créée."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Créer une promotion"
      subtitle="Elle sera visible sur vos fiches et dans les routines pendant la période choisie."
      footer={
        <>
          {error && (
            <span role="alert" className="mr-auto text-[12.5px] font-semibold text-partner-danger">
              {error}
            </span>
          )}
          <PillButton variant="ghost" onClick={onClose}>
            Annuler
          </PillButton>
          <PillButton onClick={save} disabled={saving}>
            Créer la promotion
          </PillButton>
        </>
      }
    >
      <div className="mb-3.5 flex flex-col gap-1.5">
        <label htmlFor="promo-name" className="partner-lbl">
          Nom de la promotion
        </label>
        <input id="promo-name" type="text" placeholder="Ex. Rituel du soir" value={nom} onChange={(e) => setNom(e.target.value)} className="partner-input" />
        <span className="text-[12.5px] text-partner-muted">Visible uniquement par vous.</span>
      </div>
      <div className="mb-3.5 flex flex-col gap-1.5">
        <label htmlFor="promo-off" className="partner-lbl">
          Réduction (%)
        </label>
        <input
          id="promo-off"
          type="number"
          min={5}
          max={50}
          step={5}
          inputMode="numeric"
          value={reduction}
          onChange={(e) => setReduction(e.target.value === "" ? "" : Number(e.target.value))}
          className="partner-input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label htmlFor="promo-from" className="partner-lbl">
            Du
          </label>
          <input id="promo-from" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className="partner-input" />
        </div>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label htmlFor="promo-to" className="partner-lbl">
            Au
          </label>
          <input id="promo-to" type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="partner-input" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="partner-lbl">Produits concernés</span>
        {online.length ? (
          <div className="flex flex-wrap gap-2">
            {online.map((p) => (
              <Chip key={p.id} pressed={selected.includes(p.id)} onClick={() => toggle(p.id)}>
                {p.nom}
              </Chip>
            ))}
          </div>
        ) : (
          <p className="text-[13.5px] text-partner-muted">Seuls les produits en ligne peuvent être en promotion. Aucun n&apos;est en ligne pour le moment.</p>
        )}
      </div>
    </Drawer>
  );
}
