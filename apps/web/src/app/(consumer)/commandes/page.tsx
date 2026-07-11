import type { Metadata } from "next";
import type { Commande } from "@withyou/shared-types";
import { formatPrice } from "@withyou/shared-utils";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Mes commandes — WithYou",
};

async function getCommandes(): Promise<Commande[]> {
  try {
    return await api.get<Commande[]>("/commandes");
  } catch {
    return [];
  }
}

export default async function CommandesPage() {
  const commandes = await getCommandes();

  if (commandes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-withyou-muted">Aucune commande pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {commandes.map((commande) => (
        <div key={commande.id} className="flex items-center justify-between rounded-2xl border border-gray-100 p-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-withyou-text">
              Commande #{commande.id.slice(0, 8)}
            </p>
            <p className="text-xs text-withyou-muted">{commande.statut}</p>
          </div>
          <p className="text-sm font-semibold text-primary-600">{formatPrice(commande.montantTotal)}</p>
        </div>
      ))}
    </div>
  );
}
