-- CreateTable
CREATE TABLE "transporteur" (
    "id_transporteur" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "wilayas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cout_colis" DECIMAL NOT NULL,
    "delai_jours" DECIMAL,
    "telephone" TEXT,
    "email" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transporteur_pkey" PRIMARY KEY ("id_transporteur")
);

-- CreateIndex
CREATE UNIQUE INDEX "transporteur_nom_key" ON "transporteur"("nom");
