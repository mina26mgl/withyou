import AdminLayoutClient from "./AdminLayoutClient";

/**
 * Mêmes polices que l'app cliente (chargées dans le layout racine) : Inter pour le
 * texte, Playfair Display pour les titres. Les classes font-partner / font-partner-heading
 * des composants partagés avec l'espace marque pointent donc vers elles ici.
 */
const CONSUMER_FONTS = {
  "--font-figtree": "var(--font-inter)",
  "--font-dm-serif": "var(--font-playfair)",
} as React.CSSProperties;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-partner" style={CONSUMER_FONTS}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </div>
  );
}
