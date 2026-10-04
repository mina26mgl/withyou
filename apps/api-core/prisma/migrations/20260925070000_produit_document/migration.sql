-- CreateTable
CREATE TABLE "produit_document" (
    "id_document" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_produit" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" INTEGER,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produit_document_pkey" PRIMARY KEY ("id_document")
);

-- CreateIndex
CREATE INDEX "produit_document_id_produit_idx" ON "produit_document"("id_produit");

-- AddForeignKey
ALTER TABLE "produit_document" ADD CONSTRAINT "produit_document_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;

