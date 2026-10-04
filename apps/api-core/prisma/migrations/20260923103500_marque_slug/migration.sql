-- AlterTable
ALTER TABLE "marque" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "unique_marque_slug" ON "marque"("slug");

