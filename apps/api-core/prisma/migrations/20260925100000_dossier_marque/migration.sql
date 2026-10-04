-- AlterTable
ALTER TABLE "demande_partenaire" ADD COLUMN     "checks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "message_refus" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "demande_document" (
    "id_document" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_demande" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "taille" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demande_document_pkey" PRIMARY KEY ("id_document")
);

-- CreateIndex
CREATE INDEX "demande_document_id_demande_idx" ON "demande_document"("id_demande");

-- AddForeignKey
ALTER TABLE "demande_document" ADD CONSTRAINT "demande_document_id_demande_fkey" FOREIGN KEY ("id_demande") REFERENCES "demande_partenaire"("id_demande") ON DELETE CASCADE ON UPDATE NO ACTION;

