-- AlterTable: invitations de l'équipe marque (table vide jusqu'ici)
ALTER TABLE "invitation_partenaire" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "nom" TEXT,
ADD COLUMN     "prenom" TEXT,
ADD COLUMN     "titre_poste" TEXT,
ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(6) USING (CURRENT_TIMESTAMP + INTERVAL '30 days');

-- AlterTable
ALTER TABLE "partenaire_contact" ADD COLUMN     "nom" TEXT,
ADD COLUMN     "prenom" TEXT,
ADD COLUMN     "telephone" TEXT;

-- Identité reprise du profil cliente quand il existe
UPDATE "partenaire_contact" pc
SET "prenom" = c."prenom", "nom" = c."nom"
FROM "consomateur" c
WHERE c."id_usr" = pc."id_usr" AND pc."prenom" IS NULL;
