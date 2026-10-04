import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ma trousse — WithYou",
};

export default function PanierLayout({ children }: { children: React.ReactNode }) {
  return children;
}
