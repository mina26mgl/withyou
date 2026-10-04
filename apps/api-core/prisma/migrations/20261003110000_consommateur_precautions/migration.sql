-- Précautions de l'onboarding (traitement prescrit, actif fort, grossesse ou allaitement).
ALTER TABLE "consomateur" ADD COLUMN     "precautions" TEXT[] DEFAULT ARRAY[]::TEXT[];
