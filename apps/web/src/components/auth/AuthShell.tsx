"use client";
import type { CSSProperties, ReactNode } from "react";
import { PapillonVideo } from "./PapillonVideo";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Mise en page commune connexion / inscription :
 * à gauche le formulaire sur fond nuage (haut) + colline fleurie (bas),
 * séparateur floral vertical, à droite vidéo papillon + illustration bg_login en bas à droite.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col-reverse overflow-hidden bg-[#FAFFFB] md:flex-row"
      style={{ "--auth-sep-angle": "8deg" } as CSSProperties}
    >
      {/* Fond toile sur toute la page */}
      <img src="/bg.png" alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

      {/* Illustration (bonhomme, lavande, papillons) collée en bas à droite de l'écran.
          Le PNG est transparent sur sa partie gauche : il peut passer sous la ligne. */}
      <img
        src="/bg_login.png"
        alt="Mascotte WithYou"
        className="hidden md:block absolute right-0 -bottom-[6vh] h-[85vh] w-auto max-w-none pointer-events-none select-none"
        // multiply : le halo blanc du PNG se fond dans la toile ; fondu en haut ; le bas de l'image (et du halo) dépasse sous l'écran
        style={{
          mixBlendMode: "multiply",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 22%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%)",
        }}
      />

      {/* Côté gauche : nuage en haut, colline fleurie en bas, formulaire au centre */}
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-10 md:w-1/2 md:px-8">
        <div className="auth-cloud absolute left-0 right-0 top-0 pointer-events-none">
          {/* Fondu transparent vers la toile (pas de blanc) */}
          <img
            src="/nuage_inscription.png"
            alt=""
            className="w-full h-full object-cover object-top"
            style={{
              maskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 35%, transparent 100%)",
            }}
          />
        </div>
        <div className="auth-hill absolute inset-x-0 bottom-0 pointer-events-none">
          <img src="/background.png" alt="" className="w-full h-full object-cover object-bottom" />
        </div>

        <div className="relative z-10 w-full max-w-[400px] rounded-3xl bg-white/80 px-6 py-8 shadow-[0_10px_40px_rgba(7,50,13,0.08)] backdrop-blur-md md:px-8">
          <h1
            className="font-playfair font-bold text-center"
            style={{ fontSize: "32px", color: "#07320D", lineHeight: 1.05, letterSpacing: "-0.05em" }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-center text-sm" style={{ color: "#4A6E4F" }}>
              {subtitle}
            </p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>

      {/* Séparateur floral */}
      <img
        src="/line_separator.png"
        alt=""
        aria-hidden
        className="hidden md:block absolute left-1/2 top-1/2 z-20 h-[115vh] w-auto -translate-x-1/2 -translate-y-1/2 rotate-[var(--auth-sep-angle)] pointer-events-none select-none"
      />

      {/* Côté droit : papillons en haut, illustration bg_login en bas à droite */}
      <div className="relative flex w-full items-center justify-center px-4 pt-10 md:w-1/2 md:min-h-[100dvh] md:p-0">
        {/* Vidéo retournée, collée au bord droit et au haut de l'écran : le papillon
            sort par la bordure de l'écran. Fond blanc retiré dans PapillonVideo ;
            bords gauche et bas fondus pour ne jamais voir le cadre. z-30 : premier plan. */}
        <div
          className="absolute right-0 top-0 z-30 w-full max-w-[640px] pointer-events-none"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 30%), linear-gradient(to top, transparent 0%, black 30%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 30%), linear-gradient(to top, transparent 0%, black 30%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <PapillonVideo className="block w-full -scale-x-100" />
        </div>
        {/* Mobile : illustration recadrée sur sa partie droite */}
        <img
          src="/bg_login.png"
          alt="Mascotte WithYou"
          className="md:hidden relative h-[280px] w-full object-cover object-right"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>
    </div>
  );
}

export const authInputClass =
  "w-full rounded-2xl border border-[#DCE8DF] bg-white px-4 py-3 text-sm text-[#07320D] focus:outline-none focus:ring-2 focus:ring-[#4A6E4F]/40 focus:border-[#4A6E4F]";

export const authButtonClass = "w-full !bg-[#07320D] hover:!bg-[#0d4a16] text-white";
