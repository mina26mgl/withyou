-- CreateEnum
CREATE TYPE "categorie_specialiste" AS ENUM ('EXPERT', 'CREATRICE');

-- AlterTable
ALTER TABLE "salon" ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "specialiste" (
    "id_specialiste" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categorie" "categorie_specialiste" NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "wilaya" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "disponibilites" TEXT,
    "audience" TEXT,
    "reseau" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialiste_pkey" PRIMARY KEY ("id_specialiste")
);

-- CreateIndex
CREATE INDEX "specialiste_categorie_actif_idx" ON "specialiste"("categorie", "actif");

