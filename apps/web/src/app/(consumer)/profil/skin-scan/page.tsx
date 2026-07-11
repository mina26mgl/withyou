import type { Metadata } from "next";
import SkinScanForm from "@/components/skin/SkinScanForm";

export const metadata: Metadata = {
  title: "Scan IA — WithYou",
};

export default function SkinScanPage() {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <h1 className="text-lg font-semibold text-withyou-text">Découvrez votre profil de peau</h1>
      </div>
      <SkinScanForm />
    </div>
  );
}
