-- Favoris de la cliente (cœur des cartes produit).
CREATE TABLE "wishlist" (
    "id_consumer" UUID NOT NULL,
    "id_produit" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id_consumer", "id_produit")
);

CREATE INDEX "wishlist_id_produit_idx" ON "wishlist"("id_produit");

ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_id_consumer_fkey" FOREIGN KEY ("id_consumer") REFERENCES "consomateur"("id_consumer") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;
