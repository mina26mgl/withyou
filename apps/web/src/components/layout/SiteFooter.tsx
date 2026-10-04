import Image from "next/image";
import Link from "next/link";

const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" };

const FOOTER_COLUMNS: { title: string; links: { label: string; href?: string }[] }[] = [
  {
    title: "Navigation",
    links: [
      { label: "Home", href: "/home" },
      { label: "Mon Routine", href: "/routine" },
      { label: "Search Products", href: "/search" },
    ],
  },
  {
    title: "Support",
    links: [{ label: "Contact Us" }, { label: "FAQ" }, { label: "Shipping & Returns" }, { label: "About us" }],
  },
  {
    title: "Follow Us",
    links: [{ label: "Instagram" }, { label: "Facebook" }, { label: "Tiktok" }],
  },
];

/** Bas des pages cliente (/profil, /search) : logo, liens, prairie ; la barre de navigation passe dessus. */
export default function SiteFooter() {
  return (
    <footer>
      {/* Logo et liens */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "48px 0 32px" }}>
          <Image src="/logo_withyou.png" alt="withyou" width={142} height={52} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1fr", gap: 12 }}>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ ...INTER, fontSize: 15, fontWeight: 600, color: "#333333", margin: "0 0 2px" }}>{col.title}</p>
              {col.links.map((link) =>
                link.href ? (
                  <Link key={link.label} href={link.href} style={{ ...INTER, fontSize: 13, color: "#667085", textDecoration: "none" }}>
                    {link.label}
                  </Link>
                ) : (
                  <span key={link.label} style={{ ...INTER, fontSize: 13, color: "#667085" }}>
                    {link.label}
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prairie, fondue dans la page par le haut */}
      <div style={{ position: "relative", height: 190, marginTop: 24 }}>
        <Image src="/footer.png" alt="" fill sizes="430px" style={{ objectFit: "cover", objectPosition: "center 58%" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(360deg, rgba(252, 255, 253, 0) 0%, #FCFFFD 93.17%)" }} />
        <p
          style={{
            position: "relative",
            fontFamily: "var(--font-playfair)",
            fontSize: 14,
            color: "#4A6E4F",
            textAlign: "center",
            margin: 0,
            paddingTop: 20,
          }}
        >
          All rights reserved 2026
        </p>
      </div>
    </footer>
  );
}
