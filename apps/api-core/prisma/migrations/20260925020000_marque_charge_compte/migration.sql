-- AlterTable
ALTER TABLE "marque" ADD COLUMN     "id_charge_compte" UUID;

-- AddForeignKey
ALTER TABLE "marque" ADD CONSTRAINT "marque_id_charge_compte_fkey" FOREIGN KEY ("id_charge_compte") REFERENCES "admin"("id_admin") ON DELETE SET NULL ON UPDATE NO ACTION;

