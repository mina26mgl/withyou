-- CreateEnum
CREATE TYPE "page_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'LIVE');

-- CreateEnum
CREATE TYPE "produit_status" AS ENUM ('DRAFT', 'IN_REVIEW', 'ONLINE', 'REJECTED');

-- AlterTable
ALTER TABLE "identity_marque" ADD COLUMN     "audio_url" TEXT,
ADD COLUMN     "title_font" TEXT NOT NULL DEFAULT 'serif';

-- AlterTable
ALTER TABLE "marque" ADD COLUMN     "draft" JSONB,
ADD COLUMN     "origin" TEXT,
ADD COLUMN     "page_status" "page_status" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "produit" ADD COLUMN     "moment" TEXT,
ADD COLUMN     "needs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "size" TEXT,
ADD COLUMN     "skin_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "status",
ADD COLUMN     "status" "produit_status" NOT NULL DEFAULT 'DRAFT';

