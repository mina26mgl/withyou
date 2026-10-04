-- CreateTable
CREATE TABLE "marque_legal" (
    "id_marque" UUID NOT NULL,
    "nif" TEXT,
    "nis" TEXT,
    "rc" TEXT,
    "article_imposition" TEXT,
    "rib" TEXT,
    "banque" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "marque_legal_pkey" PRIMARY KEY ("id_marque")
);

-- AddForeignKey
ALTER TABLE "marque_legal" ADD CONSTRAINT "marque_legal_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

