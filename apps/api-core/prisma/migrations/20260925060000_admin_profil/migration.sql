-- AlterTable
ALTER TABLE "admin" ADD COLUMN     "telephone" TEXT,
ADD COLUMN     "poste" TEXT,
ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "desactive_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "admin_invitation" (
    "id_invitation" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role_admin" TEXT NOT NULL,
    "poste" TEXT,
    "invited_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_invitation_pkey" PRIMARY KEY ("id_invitation")
);

-- CreateIndex
CREATE INDEX "admin_invitation_email_idx" ON "admin_invitation"("email");

-- AddForeignKey
ALTER TABLE "admin_invitation" ADD CONSTRAINT "admin_invitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "admin"("id_admin") ON DELETE NO ACTION ON UPDATE NO ACTION;
