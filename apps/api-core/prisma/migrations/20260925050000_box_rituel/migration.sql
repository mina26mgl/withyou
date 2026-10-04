-- CreateEnum
CREATE TYPE "box_statut" AS ENUM ('PREPARATION', 'ASSEMBLEE', 'EXPEDIEE');

-- CreateEnum
CREATE TYPE "box_candidature_statut" AS ENUM ('NOUVELLE', 'RETENUE', 'REFUSEE');

-- CreateTable
CREATE TABLE "box_rituel" (
    "id_box" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "mois" DATE NOT NULL,
    "date_assemblage" DATE NOT NULL,
    "date_expedition" DATE NOT NULL,
    "statut" "box_statut" NOT NULL DEFAULT 'PREPARATION',
    "demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_rituel_pkey" PRIMARY KEY ("id_box")
);

-- CreateTable
CREATE TABLE "box_variante" (
    "id_variante" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_box" UUID NOT NULL,
    "type_peau" TEXT NOT NULL,
    "abonnees" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "box_variante_pkey" PRIMARY KEY ("id_variante")
);

-- CreateTable
CREATE TABLE "box_produit" (
    "id_box_produit" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_box" UUID NOT NULL,
    "id_produit" UUID,
    "nom_produit" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "variantes" TEXT[],
    "quantite_necessaire" INTEGER NOT NULL,
    "quantite_confirmee" INTEGER NOT NULL DEFAULT 0,
    "marque_a_repondu" BOOLEAN NOT NULL DEFAULT false,
    "relance_at" TIMESTAMPTZ(6),

    CONSTRAINT "box_produit_pkey" PRIMARY KEY ("id_box_produit")
);

-- CreateTable
CREATE TABLE "box_candidature" (
    "id_candidature" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_box" UUID NOT NULL,
    "id_marque" UUID,
    "marque" TEXT NOT NULL,
    "nom_produit" TEXT NOT NULL,
    "variante" TEXT NOT NULL,
    "statut" "box_candidature_statut" NOT NULL DEFAULT 'NOUVELLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "box_candidature_pkey" PRIMARY KEY ("id_candidature")
);

-- CreateIndex
CREATE UNIQUE INDEX "box_rituel_mois_key" ON "box_rituel"("mois");

-- CreateIndex
CREATE UNIQUE INDEX "box_variante_id_box_type_peau_key" ON "box_variante"("id_box", "type_peau");

-- AddForeignKey
ALTER TABLE "box_variante" ADD CONSTRAINT "box_variante_id_box_fkey" FOREIGN KEY ("id_box") REFERENCES "box_rituel"("id_box") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "box_produit" ADD CONSTRAINT "box_produit_id_box_fkey" FOREIGN KEY ("id_box") REFERENCES "box_rituel"("id_box") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "box_produit" ADD CONSTRAINT "box_produit_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "box_candidature" ADD CONSTRAINT "box_candidature_id_box_fkey" FOREIGN KEY ("id_box") REFERENCES "box_rituel"("id_box") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "box_candidature" ADD CONSTRAINT "box_candidature_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE SET NULL ON UPDATE NO ACTION;

