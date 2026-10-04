import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes commandes — WithYou",
};

export default function CommandesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
