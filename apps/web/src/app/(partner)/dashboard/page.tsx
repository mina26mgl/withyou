import type { Metadata } from "next";
import type { Produit } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Dashboard partenaire — WithYou",
};

async function getProduitsPartenaire(): Promise<Produit[]> {
  try {
    return await api.get<Produit[]>("/produits/me");
  } catch {
    return [];
  }
}

export default async function PartnerDashboardPage() {
  const produits = await getProduitsPartenaire();

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto px-6 py-8 lg:px-8">
      <h1 className="text-xl font-semibold text-withyou-text">Mes produits</h1>
      <table className="w-full text-sm border border-gray-100 rounded-2xl overflow-hidden">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium text-withyou-muted">Produit</th>
            <th className="px-4 py-2 font-medium text-withyou-muted">Prix</th>
            <th className="px-4 py-2 font-medium text-withyou-muted">Stock</th>
            <th className="px-4 py-2 font-medium text-withyou-muted">Statut</th>
          </tr>
        </thead>
        <tbody>
          {produits.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-withyou-muted">
                Aucun produit pour le moment.
              </td>
            </tr>
          ) : (
            produits.map((produit) => (
              <tr key={produit.id} className="border-t border-gray-100">
                <td className="px-4 py-2 text-withyou-text">{produit.nom}</td>
                <td className="px-4 py-2">{formatPrice(produit.prix)}</td>
                <td className="px-4 py-2">{produit.stock}</td>
                <td className="px-4 py-2">{produit.statut}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
