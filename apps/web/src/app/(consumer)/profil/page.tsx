import type { Metadata } from "next";
import Link from "next/link";
import type { Consommateur } from "@withyou/shared-types";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Mon profil — WithYou",
};

async function getConsommateur(): Promise<Consommateur | null> {
  try {
    return await api.get<Consommateur>("/users/me/consommateur");
  } catch {
    return null;
  }
}

export default async function ProfilPage() {
  const consommateur = await getConsommateur();

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {consommateur ? (
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-withyou-text">
            {consommateur.prenom} {consommateur.nom}
          </p>
          <p className="text-sm text-withyou-muted">{consommateur.pointsFidelite} points fidélité</p>
        </div>
      ) : (
        <p className="text-sm text-withyou-muted">Connectez-vous pour voir votre profil.</p>
      )}

      <nav className="flex flex-col gap-2">
        <Link href="/profil/skin-scan" className="rounded-2xl border border-gray-100 px-4 py-3 text-sm text-withyou-text">
          Mon profil de peau
        </Link>
        <Link href="/commandes" className="rounded-2xl border border-gray-100 px-4 py-3 text-sm text-withyou-text">
          Mes commandes
        </Link>
      </nav>
    </div>
  );
}
