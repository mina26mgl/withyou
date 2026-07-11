import type { Metadata } from "next";
import type { LigneCommande, Produit } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Panier — WithYou",
};

interface PanierLigne extends LigneCommande {
  produit: Produit;
}

async function getPanier(): Promise<PanierLigne[]> {
  try {
    return await api.get<PanierLigne[]>("/panier");
  } catch {
    return [];
  }
}

export default async function PanierPage() {
  const lignes = await getPanier();
  const total = lignes.reduce((sum, l) => sum + l.prixUnitaire * l.quantite, 0);

  if (lignes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-withyou-muted">Votre panier est vide.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {lignes.map((ligne) => (
        <div key={ligne.id} className="flex items-center justify-between rounded-2xl border border-gray-100 p-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-withyou-text">{ligne.produit.nom}</p>
            <p className="text-xs text-withyou-muted">Qté : {ligne.quantite}</p>
          </div>
          <p className="text-sm font-semibold text-primary-600">
            {formatPrice(ligne.prixUnitaire * ligne.quantite)}
          </p>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <p className="text-sm font-semibold text-withyou-text">Total</p>
        <p className="text-sm font-bold text-primary-600">{formatPrice(total)}</p>
      </div>
    </div>
  );
}
