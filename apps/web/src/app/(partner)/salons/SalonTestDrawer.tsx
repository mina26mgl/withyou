"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Produit } from "@withyou/shared-types";
import { Drawer } from "@/components/partner/Drawer";
import { PillButton } from "@/components/partner/PillButton";
import { apiErrorMessage, partnerApi } from "@/lib/partnerApi";

const WILAYAS = ["Peu importe", "Alger", "Oran", "Tizi Ouzou", "Constantine", "Béjaïa"];

export function SalonTestDrawer({
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
  const eligible = products.filter((p) => p.statut !== "DRAFT");
  const [produitId, setProduitId] = useState("");
  const [echantillons, setEchantillons] = useState<number | "">(15);
  const [wilaya, setWilaya] = useState(WILAYAS[0]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProduitId(eligible[0]?.id ?? "");
    setEchantillons(15);
    setWilaya(WILAYAS[0]);
    setQuestion("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save() {
    const n = Number(echantillons);
    if (!produitId) return setError("Choisissez le produit à faire tester.");
    if (!(n >= 5 && n <= 50)) return setError("Le nombre d'échantillons doit être entre 5 et 50.");
    const token = await getToken();
    if (!token) return;
    setError("");
    setSaving(true);
    try {
      await partnerApi.createSalonTest(token, { produitId, echantillons: n, wilaya, question: question || undefined });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err, "La demande n'a pas pu être envoyée."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Proposer un test en salon"
      subtitle="Nous trouvons le salon partenaire qui correspond à votre produit et à votre cible."
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
          <PillButton onClick={save} disabled={saving || eligible.length === 0}>
            Envoyer la demande
          </PillButton>
        </>
      }
    >
      <div className="mb-3.5 flex flex-col gap-1.5">
        <label htmlFor="test-product" className="partner-lbl">
          Produit à tester
        </label>
        <select id="test-product" value={produitId} onChange={(e) => setProduitId(e.target.value)} className="partner-input">
          {eligible.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
        {eligible.length === 0 && (
          <span className="text-[12.5px] text-partner-muted">Envoyez d&apos;abord un produit en vérification pour pouvoir le faire tester.</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label htmlFor="test-count" className="partner-lbl">
            Échantillons à envoyer
          </label>
          <input
            id="test-count"
            type="number"
            min={5}
            max={50}
            inputMode="numeric"
            value={echantillons}
            onChange={(e) => setEchantillons(e.target.value === "" ? "" : Number(e.target.value))}
            className="partner-input"
          />
          <span className="text-[12.5px] text-partner-muted">Entre 5 et 50. Les frais d&apos;envoi sont pris en charge par withyou.</span>
        </div>
        <div className="mb-3.5 flex flex-col gap-1.5">
          <label htmlFor="test-wilaya" className="partner-lbl">
            Wilaya souhaitée
          </label>
          <select id="test-wilaya" value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="partner-input">
            {WILAYAS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="test-question" className="partner-lbl">
          Ce que vous voulez savoir
        </label>
        <textarea
          id="test-question"
          rows={3}
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex. La texture convient-elle aux peaux grasses en été ?"
          className="partner-input resize-y"
        />
      </div>
    </Drawer>
  );
}
