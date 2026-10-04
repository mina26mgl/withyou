-- CreateEnum
CREATE TYPE "compte_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "incident_type" AS ENUM ('BRAND', 'CLIENT', 'PAYMENT', 'QUALITY', 'CARRIER');

-- CreateEnum
CREATE TYPE "validation_kind" AS ENUM ('PRODUCT', 'PAGE', 'BRAND', 'PROOF');

-- CreateEnum
CREATE TYPE "validation_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "marque" ADD COLUMN     "commission_rate" DECIMAL NOT NULL DEFAULT 15,
ADD COLUMN     "compte_status" "compte_status" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspended_reason" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Artisan';

-- CreateTable
CREATE TABLE "order_incident" (
    "id_incident" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_order" UUID NOT NULL,
    "type" "incident_type" NOT NULL,
    "reason" TEXT NOT NULL,
    "id_marque" UUID,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_incident_pkey" PRIMARY KEY ("id_incident")
);

-- CreateTable
CREATE TABLE "brand_pickup" (
    "id_pickup" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_order" UUID NOT NULL,
    "id_marque" UUID NOT NULL,
    "received" BOOLEAN NOT NULL DEFAULT false,
    "received_at" TIMESTAMPTZ(6),

    CONSTRAINT "brand_pickup_pkey" PRIMARY KEY ("id_pickup")
);

-- CreateTable
CREATE TABLE "refund_request" (
    "id_refund" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_order" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ACCOUNTING',
    "requested_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_request_pkey" PRIMARY KEY ("id_refund")
);

-- CreateTable
CREATE TABLE "excluded_ingredient" (
    "id_excluded" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excluded_ingredient_pkey" PRIMARY KEY ("id_excluded")
);

-- CreateTable
CREATE TABLE "validation_request" (
    "id_validation" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "validation_kind" NOT NULL,
    "id_marque" UUID NOT NULL,
    "id_produit" UUID,
    "status" "validation_status" NOT NULL DEFAULT 'PENDING',
    "rejection_message" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "validation_request_pkey" PRIMARY KEY ("id_validation")
);

-- CreateTable
CREATE TABLE "validation_check" (
    "id_check" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_validation" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "ai_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "validation_check_pkey" PRIMARY KEY ("id_check")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id_log" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_admin_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id_log")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_pickup_id_order_id_marque_key" ON "brand_pickup"("id_order", "id_marque");

-- CreateIndex
CREATE UNIQUE INDEX "excluded_ingredient_nom_key" ON "excluded_ingredient"("nom");

-- AddForeignKey
ALTER TABLE "order_incident" ADD CONSTRAINT "order_incident_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_incident" ADD CONSTRAINT "order_incident_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "brand_pickup" ADD CONSTRAINT "brand_pickup_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "brand_pickup" ADD CONSTRAINT "brand_pickup_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refund_request" ADD CONSTRAINT "refund_request_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "admin"("id_admin") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_request" ADD CONSTRAINT "validation_request_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_request" ADD CONSTRAINT "validation_request_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "validation_check" ADD CONSTRAINT "validation_check_id_validation_fkey" FOREIGN KEY ("id_validation") REFERENCES "validation_request"("id_validation") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_admin_id_fkey" FOREIGN KEY ("actor_admin_id") REFERENCES "admin"("id_admin") ON DELETE NO ACTION ON UPDATE NO ACTION;

