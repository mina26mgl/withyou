-- CreateEnum
CREATE TYPE "placement_kind" AS ENUM ('ROUTINE', 'HOME', 'BOX', 'INFLUENCE');

-- CreateEnum
CREATE TYPE "salon_test_status" AS ENUM ('PENDING', 'RUNNING', 'DONE');

-- CreateEnum
CREATE TYPE "analytics_event_type" AS ENUM ('PAGE_VIEW', 'PRODUCT_OPEN', 'PRODUCT_KEPT', 'SEARCH');

-- CreateTable
CREATE TABLE "avis" (
    "id_avis" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_produit" UUID NOT NULL,
    "id_marque" UUID NOT NULL,
    "id_consumer" UUID,
    "auteur" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "texte" TEXT NOT NULL,
    "skin_type" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "reply" TEXT,
    "replied_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id_avis")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id_promotion" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_marque" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "reduction" INTEGER NOT NULL,
    "date_debut" DATE NOT NULL,
    "date_fin" DATE NOT NULL,
    "utilisations" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id_promotion")
);

-- CreateTable
CREATE TABLE "promotion_produit" (
    "id_promotion" UUID NOT NULL,
    "id_produit" UUID NOT NULL,

    CONSTRAINT "promotion_produit_pkey" PRIMARY KEY ("id_promotion","id_produit")
);

-- CreateTable
CREATE TABLE "placement_request" (
    "id_request" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_marque" UUID NOT NULL,
    "kind" "placement_kind" NOT NULL,
    "id_produit" UUID,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_request_pkey" PRIMARY KEY ("id_request")
);

-- CreateTable
CREATE TABLE "salon" (
    "id_salon" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "wilaya" TEXT NOT NULL,
    "ville" TEXT,
    "code" TEXT NOT NULL,
    "formee" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salon_pkey" PRIMARY KEY ("id_salon")
);

-- CreateTable
CREATE TABLE "salon_test" (
    "id_test" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_marque" UUID NOT NULL,
    "id_produit" UUID NOT NULL,
    "id_salon" UUID,
    "echantillons" INTEGER NOT NULL,
    "wilaya_souhaitee" TEXT,
    "question" TEXT,
    "status" "salon_test_status" NOT NULL DEFAULT 'PENDING',
    "testeuses" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(2,1),
    "citation" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salon_test_pkey" PRIMARY KEY ("id_test")
);

-- CreateTable
CREATE TABLE "analytics_event" (
    "id_event" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "analytics_event_type" NOT NULL,
    "id_marque" UUID,
    "id_produit" UUID,
    "id_consumer" UUID,
    "query" TEXT,
    "skin_type" TEXT,
    "wilaya" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_event_pkey" PRIMARY KEY ("id_event")
);

-- CreateIndex
CREATE INDEX "idx_avis_marque" ON "avis"("id_marque", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "salon_code_key" ON "salon"("code");

-- CreateIndex
CREATE INDEX "idx_event_marque" ON "analytics_event"("id_marque", "type", "created_at");

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_id_consumer_fkey" FOREIGN KEY ("id_consumer") REFERENCES "consomateur"("id_consumer") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_produit" ADD CONSTRAINT "promotion_produit_id_promotion_fkey" FOREIGN KEY ("id_promotion") REFERENCES "promotion"("id_promotion") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotion_produit" ADD CONSTRAINT "promotion_produit_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "placement_request" ADD CONSTRAINT "placement_request_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "salon_test" ADD CONSTRAINT "salon_test_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "salon_test" ADD CONSTRAINT "salon_test_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "salon_test" ADD CONSTRAINT "salon_test_id_salon_fkey" FOREIGN KEY ("id_salon") REFERENCES "salon"("id_salon") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "analytics_event" ADD CONSTRAINT "analytics_event_id_consumer_fkey" FOREIGN KEY ("id_consumer") REFERENCES "consomateur"("id_consumer") ON DELETE SET NULL ON UPDATE NO ACTION;

