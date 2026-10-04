import type { Metadata } from "next";
import Image from "next/image";
import SearchBar from "@/components/search/SearchBar";
import ProductSlider from "@/components/product/ProductSlider";
import BrandSlider from "@/components/brand/BrandSlider";
import { FirstName } from "@/components/account/FirstName";

export const metadata: Metadata = {
  title: "Accueil — WithYou",
};

export default function HomePage() {
  return (
    <div
      className="w-full overflow-y-scroll scrollbar-white"
      style={{
        height: "100dvh",
      }}
    >

      {/* ── Section 1 : Hero ── */}
      <div
        className="relative w-full flex-shrink-0"
        style={{ height: "100dvh" }}
      >
        {/* Jardin – absolute → monte avec la section */}
        <div className="absolute bottom-0 left-0 right-0 h-[82%] pointer-events-none z-0">
          <Image
            src="/background.png"
            alt=""
            fill
            className="object-cover object-bottom"
            quality={100}
            sizes="(max-width: 430px) 960px, 960px"
            priority
          />
          {/* Blur en haut du jardin */}
          <div
            className="absolute inset-x-0 top-0 h-36 pointer-events-none"
            style={{
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              maskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 30%, transparent 100%)",
            }}
          />
          {/* Dégradé blanc en haut */}
          <div
            className="absolute inset-x-0 top-0 h-44 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, #FAFFFB 0%, rgba(250,255,251,0.88) 30%, rgba(250,255,251,0.4) 65%, transparent 100%)",
            }}
          />
          {/* Fondu blanc en bas – à la base du jardin */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: "120px",
              background: "linear-gradient(to bottom, rgba(250,255,251,0) 0%, rgba(250,255,251,0.85) 70%, #FAFFFB 100%)",
            }}
          />
        </div>

        {/* Contenu hero */}
        <div className="hero-fade-on-scroll relative z-10 h-full flex flex-col items-center justify-center px-6 pb-52">
          <video
            src="/papillon.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full max-w-[393px] top-30"
            style={{ objectFit: "contain", display: "block", border: "none", outline: "none", mixBlendMode: "multiply" }}
          />

          <p
            className="mb-2 font-playfair text-center w-full"
            style={{ fontSize: "20px", color: "#4A6E4F", letterSpacing: "-0.09em" }}
          >
            Bonjour{" "}
            <FirstName className="font-semibold" />
          </p>

          <h1
            className="font-playfair font-bold mb-6 text-center"
            style={{ fontSize: "36px", color: "#07320D", lineHeight: "1.01", letterSpacing: "-0.07em" }}
          >
            De quoi votre peau a-t-elle besoin aujourd&apos;hui&nbsp;?
          </h1>

          <SearchBar aiMode />
        </div>
      </div>

      {/* ── Section 2 : Produits ── */}
      <div
        className="relative w-full bg-[#FAFFFB] pb-28"
        style={{ minHeight: "100dvh", borderRadius: "28px 28px 0 0" }}
      >
        <ProductSlider title="Pour votre soirée" limit={5} />

        <h2
          className="font-playfair font-bold px-4 mt-8 mb-4"
          style={{ fontSize: "22px", color: "#07320D" }}
        >
          Les marques du jour
        </h2>
        <BrandSlider />
      </div>

    </div>
  );
}