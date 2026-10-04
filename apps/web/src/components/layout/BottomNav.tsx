"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DEFAULT_AVATAR } from "@/lib/defaultAvatar";
import { useProfilePhoto } from "@/lib/photoStore";
import { SCAN_IA_ENABLED } from "@/lib/features";
import { useTrousse } from "@/lib/trousse";

const IconHome = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke={active ? "#1a1a1a" : "#667085"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const IconBag = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke={active ? "#1a1a1a" : "#667085"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

const IconSearch = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke={active ? "#1a1a1a" : "#667085"} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
);

const IconScan = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke={active ? "#1a1a1a" : "#667085"} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 012-2h2" />
    <path d="M17 3h2a2 2 0 012 2v2" />
    <path d="M21 17v2a2 2 0 01-2 2h-2" />
    <path d="M7 21H5a2 2 0 01-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2" />
  </svg>
);

const tabs = [
  { href: "/home", icon: IconHome },
  { href: "/panier", icon: IconBag },
  { href: "/search", icon: IconSearch },
  ...(SCAN_IA_ENABLED ? [{ href: "/profil/skin-scan", icon: IconScan }] : []),
];


function JasmineDecoration() {
  return (
    <Image
      src="/fleure-profile.png"
      alt=""
      width={18}
      height={18}
      className="object-contain drop-shadow-sm"
      priority
    />
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const photo = useProfilePhoto();
  const trousseCount = useTrousse().reduce((sum, i) => sum + i.quantite, 0);

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between"
      style={{
        width: "262px",
        height: "50px",
        borderRadius: "16px",
        padding: "6px 8px",
        gap: "4px",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.08)",
        border: "3px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(7.3px)",
        WebkitBackdropFilter: "blur(7.3px)",
      }}
    >
      {tabs.map(({ href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="relative flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              padding: "6px",
              boxSizing: "border-box",
              ...(active
                ? {
                    background: "#FFFFFF",
                    border: "1px solid #D5D7DA",
                    boxShadow:
                      "0px 1px 2px 0px rgba(16,24,40,0.05), 0px -2px 0px 0px rgba(255,255,255,0.08) inset, 0px 0px 0px 1px rgba(255,255,255,0.12) inset",
                  }
                : {}),
            }}
          >
            <Icon active={active} />
            {href === "/panier" && trousseCount > 0 && (
              <span
                aria-label={`${trousseCount} produit(s) dans ma trousse`}
                className="absolute flex items-center justify-center"
                style={{
                  top: "-5px",
                  right: "-6px",
                  minWidth: "15px",
                  height: "15px",
                  padding: "0 4px",
                  borderRadius: "100px",
                  background: "#07320D",
                  border: "1.5px solid #FFFFFF",
                  boxSizing: "border-box",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "#FFFFFF",
                  lineHeight: 1,
                }}
              >
                {trousseCount}
              </span>
            )}
          </Link>
        );
      })}

      {/* Avatar profil */}
      <Link href="/profil" className="relative flex-shrink-0">
        <div className="absolute -top-1 -right-0.5 pointer-events-none z-10">
          <JasmineDecoration />
        </div>
        <div
          className="rounded-full overflow-hidden relative z-0"
          style={{
            width: "38px",
            height: "38px",
            border: "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo ?? DEFAULT_AVATAR} alt="Profil" className="w-full h-full object-cover" />
        </div>
      </Link>
    </nav>
  );
}
