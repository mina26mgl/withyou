-- Plusieurs modes de conservation par produit (ex. « Au réfrigérateur » et
-- « À l'abri de la lumière ») : la colonne devient une liste, la valeur
-- existante en est le premier élément.
ALTER TABLE "produit" ALTER COLUMN "mode_conservation" DROP DEFAULT;
ALTER TABLE "produit" ALTER COLUMN "mode_conservation" TYPE TEXT[]
  USING CASE WHEN "mode_conservation" IS NULL OR btrim("mode_conservation") = '' THEN ARRAY[]::TEXT[]
             ELSE ARRAY["mode_conservation"] END;
ALTER TABLE "produit" ALTER COLUMN "mode_conservation" SET DEFAULT ARRAY[]::TEXT[];
