-- Packs : un produit de la marque composé d'autres produits de la même marque.
ALTER TABLE "produit" ADD COLUMN "is_pack" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "pack_produit" (
    "id_pack" UUID NOT NULL,
    "id_produit" UUID NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pack_produit_pkey" PRIMARY KEY ("id_pack", "id_produit"),
    CONSTRAINT "pack_produit_quantite_check" CHECK ("quantite" BETWEEN 1 AND 10),
    CONSTRAINT "pack_produit_distinct_check" CHECK ("id_pack" <> "id_produit")
);

CREATE INDEX "pack_produit_id_produit_idx" ON "pack_produit"("id_produit");

ALTER TABLE "pack_produit" ADD CONSTRAINT "pack_produit_id_pack_fkey" FOREIGN KEY ("id_pack") REFERENCES "produit"("id_product") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "pack_produit" ADD CONSTRAINT "pack_produit_id_produit_fkey" FOREIGN KEY ("id_produit") REFERENCES "produit"("id_product") ON DELETE RESTRICT ON UPDATE NO ACTION;
