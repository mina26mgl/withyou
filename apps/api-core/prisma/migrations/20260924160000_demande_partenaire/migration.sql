-- CreateEnum
CREATE TYPE "demande_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "demande_partenaire" (
    "id_demande" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_usr" UUID NOT NULL,
    "nom_marque" TEXT NOT NULL,
    "status" "demande_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "demande_partenaire_pkey" PRIMARY KEY ("id_demande")
);

-- CreateIndex
CREATE UNIQUE INDEX "demande_partenaire_id_usr_key" ON "demande_partenaire"("id_usr");

-- AddForeignKey
ALTER TABLE "demande_partenaire" ADD CONSTRAINT "demande_partenaire_id_usr_fkey" FOREIGN KEY ("id_usr") REFERENCES "user"("id_usr") ON DELETE CASCADE ON UPDATE NO ACTION;
