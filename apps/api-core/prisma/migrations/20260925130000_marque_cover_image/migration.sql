-- Image de couverture d'une page marque dont la couverture est une vidéo :
-- affichée pendant le chargement / en mauvaise connexion, et dans « Marques du jour ».
ALTER TABLE "identity_marque" ADD COLUMN "banner_poster_url" TEXT;
