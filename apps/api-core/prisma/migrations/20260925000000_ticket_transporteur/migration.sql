-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('OUVERT', 'REPONDU', 'RESOLU');

-- CreateTable
CREATE TABLE "ticket_transporteur" (
    "id_ticket" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_order" UUID NOT NULL,
    "id_incident" UUID,
    "transporteur" TEXT NOT NULL,
    "code_suivi" TEXT,
    "motif" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "statut" "ticket_status" NOT NULL DEFAULT 'OUVERT',
    "opened_by" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponse" TEXT,
    "reponse_at" TIMESTAMPTZ(6),
    "relances" INTEGER NOT NULL DEFAULT 0,
    "derniere_relance_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "ticket_transporteur_pkey" PRIMARY KEY ("id_ticket")
);

-- CreateIndex
CREATE INDEX "ticket_transporteur_statut_opened_at_idx" ON "ticket_transporteur"("statut", "opened_at");

-- AddForeignKey
ALTER TABLE "ticket_transporteur" ADD CONSTRAINT "ticket_transporteur_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_transporteur" ADD CONSTRAINT "ticket_transporteur_id_incident_fkey" FOREIGN KEY ("id_incident") REFERENCES "order_incident"("id_incident") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_transporteur" ADD CONSTRAINT "ticket_transporteur_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "admin"("id_admin") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_transporteur" ADD CONSTRAINT "ticket_transporteur_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "admin"("id_admin") ON DELETE NO ACTION ON UPDATE NO ACTION;

