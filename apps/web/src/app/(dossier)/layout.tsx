import { DM_Serif_Display, Figtree } from "next/font/google";

const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-dm-serif" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree" });

/** Marque inscrite, pas encore validée : même style que l'espace marque, sans son menu. */
export default function DossierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSerifDisplay.variable} ${figtree.variable} min-h-[100dvh] bg-partner-bg font-partner text-partner-ink`}>
      <main className="mx-auto flex max-w-[1100px] flex-col gap-[18px] px-4 pb-16 pt-6 lg:px-6">{children}</main>
    </div>
  );
}
