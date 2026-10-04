-- Réponses de l'onboarding cliente (quiz de peau), enregistrées étape par étape.
ALTER TABLE "consomateur" ADD COLUMN     "type_peau" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preoccupations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "routine_actuelle" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sensibilite" SMALLINT,
ADD COLUMN     "onboarding_done_at" TIMESTAMPTZ(6);
