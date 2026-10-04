-- CreateEnum
CREATE TYPE "fonctionnalite_payante" AS ENUM ('ANALYTICS', 'PROMOTION');

-- CreateEnum
CREATE TYPE "periode_abonnement" AS ENUM ('MENSUEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "statut_abonnement" AS ENUM ('DEMANDE', 'ACTIF', 'REFUSE', 'ANNULE');

-- CreateTable
CREATE TABLE "offre_abonnement" (
    "id_offre" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fonctionnalite" "fonctionnalite_payante",
    "prix_mensuel" DECIMAL NOT NULL,
    "prix_annuel" DECIMAL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offre_abonnement_pkey" PRIMARY KEY ("id_offre")
);

-- CreateTable
CREATE TABLE "abonnement_marque" (
    "id_abonnement" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_marque" UUID NOT NULL,
    "id_offre" UUID NOT NULL,
    "periode" "periode_abonnement" NOT NULL,
    "prix" DECIMAL NOT NULL,
    "statut" "statut_abonnement" NOT NULL DEFAULT 'DEMANDE',
    "demande_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "debut" TIMESTAMPTZ(6),
    "fin" TIMESTAMPTZ(6),
    "active_par" UUID,
    "message" TEXT,

    CONSTRAINT "abonnement_marque_pkey" PRIMARY KEY ("id_abonnement")
);

-- CreateIndex
CREATE UNIQUE INDEX "offre_abonnement_nom_key" ON "offre_abonnement"("nom");

-- CreateIndex
CREATE INDEX "abonnement_marque_id_marque_statut_idx" ON "abonnement_marque"("id_marque", "statut");

-- AddForeignKey
ALTER TABLE "abonnement_marque" ADD CONSTRAINT "abonnement_marque_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "abonnement_marque" ADD CONSTRAINT "abonnement_marque_id_offre_fkey" FOREIGN KEY ("id_offre") REFERENCES "offre_abonnement"("id_offre") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "abonnement_marque" ADD CONSTRAINT "abonnement_marque_active_par_fkey" FOREIGN KEY ("active_par") REFERENCES "admin"("id_admin") ON DELETE SET NULL ON UPDATE NO ACTION;


-- Offres de départ, INACTIVES tant qu'un admin n'a pas fixé leur prix dans la console.
INSERT INTO "offre_abonnement" ("nom", "description", "fonctionnalite", "prix_mensuel", "prix_annuel", "actif") VALUES
  ('Analyses avancées', 'Ventes, entonnoir de découverte, profils de peau et wilayas de vos clientes, recherches qui mènent à vos produits.', 'ANALYTICS', 0, NULL, false),
  ('Mise en avant', 'Codes promo et placements dans les routines, l''accueil, la box et les campagnes d''influence.', 'PROMOTION', 0, NULL, false)
ON CONFLICT ("nom") DO NOTHING;
