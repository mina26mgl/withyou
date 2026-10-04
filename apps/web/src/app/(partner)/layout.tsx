import { DM_Serif_Display, Figtree } from "next/font/google";
import PartnerLayoutClient from "./PartnerLayoutClient";

const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree" });

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSerifDisplay.variable} ${figtree.variable} font-partner`}>
      <PartnerLayoutClient>{children}</PartnerLayoutClient>
    </div>
  );
}
