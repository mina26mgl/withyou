-- CreateTable
CREATE TABLE "admin" (
    "id_admin" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "role_admin" TEXT NOT NULL,
    "id_usr" UUID NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id_admin")
);

-- CreateTable
CREATE TABLE "capture_scan" (
    "id_capture" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_scan" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "angle_visage" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capture_scan_pkey" PRIMARY KEY ("id_capture")
);

-- CreateTable
CREATE TABLE "categorie" (
    "id_cat" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "id_parent" UUID,
    "image_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorie_pkey" PRIMARY KEY ("id_cat")
);

-- CreateTable
CREATE TABLE "consomateur" (
    "id_consumer" UUID NOT NULL,
    "nom" TEXT,
    "prenom" TEXT,
    "birth_date" DATE,
    "id_usr" UUID NOT NULL,
    "phone" TEXT,
    "adresse" TEXT,
    "wilaya" TEXT,
    "points_fidelite" INTEGER DEFAULT 0,
    "user_vector" tsvector,
    "onboarding_done" BOOLEAN DEFAULT false,
    "gender" TEXT,
    "updated_at" TIMESTAMPTZ(6),
    "commune" TEXT,

    CONSTRAINT "consomateur_pkey" PRIMARY KEY ("id_consumer")
);

-- CreateTable
CREATE TABLE "historique_points" (
    "id_mouvement" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_consumer" UUID NOT NULL,
    "id_order" UUID,
    "points" INTEGER NOT NULL,
    "type_mouvement" TEXT NOT NULL,
    "description" TEXT,
    "date_expiration" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_points_pkey" PRIMARY KEY ("id_mouvement")
);

-- CreateTable
CREATE TABLE "historique_scan" (
    "id_scan" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_consumer" UUID NOT NULL,
    "statut_analyse" TEXT NOT NULL DEFAULT 'en_cours',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_scan_pkey" PRIMARY KEY ("id_scan")
);

-- CreateTable
CREATE TABLE "historique_stock" (
    "id_hist_stock" UUID NOT NULL,
    "id_produit" UUID NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "quantite_stock" INTEGER NOT NULL,

    CONSTRAINT "historique_stock_pkey" PRIMARY KEY ("id_hist_stock")
);

-- CreateTable
CREATE TABLE "identity_marque" (
    "id_identity" UUID NOT NULL,
    "id_marque" UUID NOT NULL,
    "couleur_principale" TEXT NOT NULL DEFAULT '#FAFFFB',
    "couleur_secondaire" TEXT NOT NULL DEFAULT '#FFFFFF',
    "couleur_titre" TEXT NOT NULL DEFAULT '#07320D',
    "couleur_titre2" TEXT,
    "couleur_text" TEXT NOT NULL DEFAULT '#4D6551',
    "couleur_text2" TEXT,
    "couleur_border" TEXT DEFAULT '#FFFFFF',
    "logo_url" TEXT,
    "banner_url" TEXT,

    CONSTRAINT "identity_marque_pkey" PRIMARY KEY ("id_identity")
);

-- CreateTable
CREATE TABLE "invitation_partenaire" (
    "id_invitation" UUID NOT NULL,
    "id_marque" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role_partenaire" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "invited_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMETZ(6) NOT NULL,

    CONSTRAINT "invitation_partenaire_pkey" PRIMARY KEY ("id_invitation")
);

-- CreateTable
CREATE TABLE "ligne_order" (
    "id_ligne" UUID NOT NULL,
    "id_order" UUID NOT NULL,
    "id_product" UUID NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prix_unitaire" DECIMAL NOT NULL,
    "comission" DECIMAL NOT NULL,

    CONSTRAINT "ligne_order_pkey" PRIMARY KEY ("id_ligne")
);

-- CreateTable
CREATE TABLE "livraison" (
    "id_ship" UUID NOT NULL,
    "id_order" UUID NOT NULL,
    "prestatire" TEXT NOT NULL,
    "code_suivi" TEXT,
    "statut" TEXT NOT NULL,
    "date_expidition" TIMESTAMPTZ(6),
    "date_livraison" TIMESTAMPTZ(6),
    "phone_correspendant" TEXT,
    "type_livraison" TEXT NOT NULL,
    "frais_livraison" DECIMAL NOT NULL,
    "created_at" TIMESTAMPTZ(6),

    CONSTRAINT "livraison_pkey" PRIMARY KEY ("id_ship")
);

-- CreateTable
CREATE TABLE "marque" (
    "id_marque" UUID NOT NULL,
    "nom_marque" TEXT NOT NULL,
    "date_creation" DATE NOT NULL,
    "adresse" TEXT NOT NULL,
    "engagement" TEXT[],
    "besoin" TEXT[],
    "wilaya_marque" TEXT NOT NULL,
    "histoire_marque" TEXT NOT NULL,

    CONSTRAINT "marque_pkey" PRIMARY KEY ("id_marque")
);

-- CreateTable
CREATE TABLE "marque_visage" (
    "id_marque" UUID NOT NULL,
    "id_visage" UUID NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "marque_visage_pkey" PRIMARY KEY ("id_marque","id_visage")
);

-- CreateTable
CREATE TABLE "order" (
    "id_order" UUID NOT NULL,
    "id_consumer" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "montant_total" DECIMAL NOT NULL,
    "montant_comission" DECIMAL NOT NULL,
    "mode_paiement" TEXT NOT NULL,
    "adresse_livraison" TEXT NOT NULL,
    "wilaya_livraison" TEXT NOT NULL,
    "commune_livraison" TEXT NOT NULL,
    "code_suivi" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_pkey" PRIMARY KEY ("id_order")
);

-- CreateTable
CREATE TABLE "paiement" (
    "id_paiement" UUID NOT NULL,
    "id_order" UUID NOT NULL,
    "methode" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "montant" DECIMAL NOT NULL,
    "transaction_ref" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "date_paiement" TIMESTAMPTZ(6),

    CONSTRAINT "paiement_pkey" PRIMARY KEY ("id_paiement")
);

-- CreateTable
CREATE TABLE "partenaire_contact" (
    "id_partenaire" UUID NOT NULL,
    "id_usr" UUID NOT NULL,
    "id_marque" UUID NOT NULL,
    "role_partenaire" TEXT NOT NULL,
    "titre_poste" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "partenaire_contact_pkey" PRIMARY KEY ("id_partenaire")
);

-- CreateTable
CREATE TABLE "produit" (
    "id_product" UUID NOT NULL,
    "id_marque" UUID NOT NULL,
    "id_categori" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ingredients" TEXT[],
    "prix" DECIMAL NOT NULL,
    "discount" DECIMAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "mode_conservation" TEXT NOT NULL,
    "produit_vector" tsvector,
    "created_at" TIMETZ(6),
    "updated_at" TIMETZ(6),
    "min_stock" INTEGER DEFAULT 5,
    "delai_reapprovisionnement" INTEGER,
    "duree_conservation_jours" INTEGER,
    "date_restockage" TIMESTAMPTZ(6),
    "comission_negocie" DECIMAL NOT NULL,

    CONSTRAINT "produit_pkey" PRIMARY KEY ("id_product")
);

-- CreateTable
CREATE TABLE "produit_image" (
    "id_image" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_produit" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "is_principale" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" TEXT,
    "storage_key" TEXT,
    "created_at" TIMESTAMPTZ(6),

    CONSTRAINT "produit_image_pkey" PRIMARY KEY ("id_image")
);

-- CreateTable
CREATE TABLE "user" (
    "id_usr" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "last_login" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "clerk_id" TEXT,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "pdpurl" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id_usr")
);

-- CreateTable
CREATE TABLE "visage" (
    "id_visage" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "photo_url" TEXT,
    "quote" TEXT,

    CONSTRAINT "visage_pkey" PRIMARY KEY ("id_visage")
);

-- CreateIndex
CREATE UNIQUE INDEX "use_unique" ON "admin"("id_usr");

-- CreateIndex
CREATE UNIQUE INDEX "unique_categorie_slug" ON "categorie"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "uniqusr" ON "consomateur"("id_usr", "phone");

-- CreateIndex
CREATE INDEX "idx_points_consumer" ON "historique_points"("id_consumer");

-- CreateIndex
CREATE UNIQUE INDEX "marque_unique" ON "identity_marque"("id_marque");

-- CreateIndex
CREATE UNIQUE INDEX "token" ON "invitation_partenaire"("token");

-- CreateIndex
CREATE UNIQUE INDEX "unique_product_per_order" ON "ligne_order"("id_order", "id_product");

-- CreateIndex
CREATE UNIQUE INDEX "transaction" ON "paiement"("transaction_ref");

-- CreateIndex
CREATE UNIQUE INDEX "clerk_uniq" ON "user"("clerk_id", "email");

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "usr_admin" FOREIGN KEY ("id_usr") REFERENCES "user"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "capture_scan" ADD CONSTRAINT "capture_scan_id_scan_fkey" FOREIGN KEY ("id_scan") REFERENCES "historique_scan"("id_scan") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categorie" ADD CONSTRAINT "fk_categorie_parent" FOREIGN KEY ("id_parent") REFERENCES "categorie"("id_cat") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "consomateur" ADD CONSTRAINT "user_consumer" FOREIGN KEY ("id_usr") REFERENCES "user"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historique_points" ADD CONSTRAINT "historique_points_id_consumer_fkey" FOREIGN KEY ("id_consumer") REFERENCES "consomateur"("id_consumer") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historique_points" ADD CONSTRAINT "historique_points_id_order_fkey" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historique_scan" ADD CONSTRAINT "historique_scan_id_consumer_fkey" FOREIGN KEY ("id_consumer") REFERENCES "consomateur"("id_consumer") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "historique_stock" ADD CONSTRAINT "produit" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "identity_marque" ADD CONSTRAINT "marque_fk" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitation_partenaire" ADD CONSTRAINT "invited_by" FOREIGN KEY ("invited_by") REFERENCES "partenaire_contact"("id_partenaire") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ligne_order" ADD CONSTRAINT "order" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ligne_order" ADD CONSTRAINT "product" FOREIGN KEY ("id_product") REFERENCES "produit"("id_product") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "livraison" ADD CONSTRAINT "order" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marque_visage" ADD CONSTRAINT "marque_visage_id_marque_fkey" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marque_visage" ADD CONSTRAINT "marque_visage_id_visage_fkey" FOREIGN KEY ("id_visage") REFERENCES "visage"("id_visage") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "consumer" FOREIGN KEY ("id_consumer") REFERENCES "consomateur"("id_consumer") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "paiement" ADD CONSTRAINT "order" FOREIGN KEY ("id_order") REFERENCES "order"("id_order") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partenaire_contact" ADD CONSTRAINT "contact_marque" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partenaire_contact" ADD CONSTRAINT "usr_contact" FOREIGN KEY ("id_usr") REFERENCES "user"("id_usr") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "produit" ADD CONSTRAINT "categorie" FOREIGN KEY ("id_categori") REFERENCES "categorie"("id_cat") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "produit" ADD CONSTRAINT "marque" FOREIGN KEY ("id_marque") REFERENCES "marque"("id_marque") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "produit_image" ADD CONSTRAINT "produit" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE NO ACTION ON UPDATE NO ACTION;

