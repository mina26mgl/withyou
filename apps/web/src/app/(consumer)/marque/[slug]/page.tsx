"use client";

import { useParams, notFound } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import ProductGrid from "@/components/product/ProductGrid";
import ProductSlider from "@/components/product/ProductSlider";
import BrandSlider from "@/components/brand/BrandSlider";
import BackButton from "@/components/brand/BackButton";
import BrandCover from "@/components/brand/BrandCover";
import type { Partenaire, Produit } from "@withyou/shared-types";
import { AlignCenter, Sparkles, Star } from "lucide-react";
import SparkleStar from "@/components/svg";
const WilayaMap = dynamic(
  () => import("@/components/brand/WilayaMapLeaflet"),
  { ssr: false, loading: () => <div style={{ width: "100%", height: "100%", background: "#f0f4f0", borderRadius: "inherit" }} /> }
);

interface MarqueUi extends Partenaire {
  couverture: string;
  principal_color: string;
  brandLogo: string;
  mapmode: "light" | "dark";
  histoire?: string;
  visge1?: string;
  visge2?: string;
  visge3?: string;
  visge1nomprenom?: string;
  visge2nomprenom?: string;
  visge3nomprenom?: string;
  visage1role?: string;
  visage2role?: string;
  visage3role?: string;
  engagement1?: string;
  engagement2?: string;
  engagement3?: string;
  engagement4?: string;
  besoin1?: string;
  besoin2?: string;
  besoin3?: string;
  besoin1img?: string;
  besoin2img?: string;
  besoin3img?: string; 
  besoin4?: string;
  besoin4img?: string;
  div_color?: string;
  text_color?: string;
  bordercolor?: string;
  secondtext_color?: string;
}

// 2. On met à jour l'interface des données du Mock
interface MarqueData {
  partenaire: MarqueUi; // On utilise le type étendu ici
  produits: Produit[
  ];
}

const MOCK_MARQUES: Record<string, MarqueData> = {
  "azul-cosmetique-story": {
    partenaire: {
      id: "mock-1",
      userId: "mock",
      nomEntreprise: "Azul Cosmetique",
      nomFondateur: "Djedid",
      prenomFondateur: "Saloi",
      type: "Cosmétiques naturels",
      statut: "ACTIVE",
      commissionRate: 0,
      couverture: "/couverture_azul.mp4",
      visge1: "/visage1.png",
      visge2: "/visage2.png",
      visge1nomprenom: "Saloi Djedid",
      visge2nomprenom: "Kevin Manson Benabdemeziem",
      visage1role: "Co-fondatrice",
      visage2role: "Co-fondateur",
      engagement1:"Origine naturelle",
      engagement2:"Rituel ancestraux",
      engagement3:"fait en algérie",
      engagement4:"Vegan",
      besoin1:"Hydratation, peaux sensibles",
      besoin2: "Rougeurs, imperfection et pores dilatés",
      besoin3: "Rides, tâches et teint terne",
      besoin1img:"/besoin1img.png",
      besoin2img:"/besoin2img.png",
      besoin3img:"/besoin3img.png",
      principal_color: "#FFECD6",
      div_color: "#FFFFFF99",
      text_color: "#031A06",
      secondtext_color:"#4D6551",
      bordercolor: "#00000014",
      brandLogo: "/azul-logo.svg",
      mapmode: "light",
      histoire:"Découvre le secret des rituels de beauté avec Azul Cosmétique. Nous partons à la recherche des rituels de beauté perdus d'Algérie. Le but, faire perdurer ces savoirs et sauvegarder les connaissances du m...",
      wilaya: "Tizi ouzou",
      urlInstagram: null,
    },
    produits: [ 
      {
        id: "azul-product-1",
        partenaireId: "mock-1",
        nom: "Azar - Rituel Nettoyant Et Démaquillant Aux Huiles Végétales (100ml)",
        description: "Rituel nettoyant et démaquillant aux huiles végétales.",
        prix: 1200,
        stock: 50,
        statut: "ACTIVE",
        imagesUrls: ["/azul-product.webp"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "azul-product-2",
        partenaireId: "mock-1",
        nom: "Clarifiant aux Plantes Naturelles (100ml)",
        description: "Clarifiant aux plantes naturelles.",
        prix: 1200,
        stock: 50,
        statut: "ACTIVE",
        imagesUrls: ["/azul-product2.png"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
  },
  "dihya-story": {
    partenaire: {
      id: "mock-2",
      userId: "mock",
      nomEntreprise: "Dihya",
      nomFondateur: "Aït Hamou",
      prenomFondateur: "Lyna",
      type: "Soins bio",
      statut: "ACTIVE",
      commissionRate: 0,
      couverture: "/couverture_dihya.png",
      visge1: "/visage1_dihya.png",
      visge2: "/visage2_dihya.png",
      visge1nomprenom: "Hayet Aoula",
      visge2nomprenom: "Manel",
      visage1role: "Partenaire", 
      visage2role: "Partenaire",
      engagement1:"Testés & Approuvés",
      engagement2:"Formules Naturelles & Actives",
      engagement3:"Engagés pour Votre Bien-Être",
      engagement4:"Marque 100% Algérienne",
      besoin1:"Kit Makeup 101",
      besoin2: "Morning Routine Pack - Trio Énergisant",
      besoin3: "Shiny Face Pack",
      besoin4: "Gamme Confort Et Soin",
      besoin1img:"/besoin1_dihya.png",
      besoin2img:"/besoin2_dihya.png",
      besoin3img:"/besoin3_dihya.png",
      besoin4img:"/besoin4_dihya.png",
      principal_color: "#232323",
      div_color: "#393939",
      text_color: "#FFFFFF",
      secondtext_color:"#FFFFFF99",
      bordercolor:"#FFFFFF33",
      mapmode: "dark",
      brandLogo: "/Logo_dihya.jpg",
      histoire:"Dihya Cosmetics, fondée en 2016, s'est engagée depuis sa création à résoudre les problèmes de peau spécifiques aux femmes algériennes. Notre parcours de 8 ans a été guidé par la recherche constante de solutions i...",
      wilaya: "Alger",
      urlInstagram: null,
    },
    produits: [],
  },
  "namira-story": {
    partenaire: {
      id: "mock-3",
      userId: "mock",
      nomEntreprise: "Aryana",
      nomFondateur: "Bensalem",
      prenomFondateur: "Rania",
      type: "Beauté orientale",
      statut: "ACTIVE",
      commissionRate: 0,
      couverture: "/couverture_namira.png",
      principal_color: "#F6D9E3",
      div_color: "#FFFFFF99",
      text_color: "#031A06",
      secondtext_color:"#4D6551",
      bordercolor: "#00000014", 
      brandLogo: "/aryana_logo.png",
      visge1: "/visage1_aryana.png",
      visge2: "/visage2_aryana.png",
      visge1nomprenom: "Dr.Rahima",
      visge2nomprenom: "Abla lebousati",
      visage1role: "Partenaire",
      visage2role: "Partenaire",
      besoin1:"Skin care",
      besoin2: "Déodorant naturel",
      besoin3: "Autres produits",
      besoin1img:"/besoin1_namira.png",
      besoin2img:"/besoin2_namira.png",
      besoin3img:"/besoin3_namira.png",
      engagement1:"Testés & Approuvés",
      engagement2:"Formules Naturelles & Actives",
      engagement3:"Engagés pour Votre Bien-Être",
      engagement4:"Marque 100% Algérienne",
      mapmode: "light",
      wilaya: "Oran",
      urlInstagram: null,
      histoire: "Découvre le secret des rituels de beauté avec Namira. Nous partons à la recherche des rituels de beauté perdus d'Algérie. Le but, faire perdurer ces savoirs et sauvegarder les connaissances du m...",
    },
    produits: [],
  },
};

export default function MarquePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [histoireExpanded, setHistoireExpanded] = useState(false);

  const data = MOCK_MARQUES[slug];
  if (!data) return notFound();

  const { partenaire, produits } = data;

  // Détection simple du type de média à partir de l'extension
  const isVideo = partenaire.couverture?.endsWith(".mp4");

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: partenaire.principal_color }}>
      {/* Bouton retour absolu au-dessus du média */}
        

      <div 
        className="relative w-[390px] mx-auto mt-4" 
        style={{ 
          height: "486px", 
          marginTop: "12px", 
          borderRadius: 40, 
          border: "1.78px solid #0000001A",
          overflow: "hidden",
          boxShadow: "1px 1px 3px 0px #0000000A, 4px 4px 6px 0px #00000008, 9px 9px 8px 0px #00000005, 16px 17px 9px 0px #00000003, 24px 26px 10px 0px #00000000",
          position: "relative" // Crucial pour positionner le texte par-dessus
        }}
      >
  
        {/* 1. LE MÉDIA DE FOND (Prend 100% de la place) */}
        {isVideo ? (
          <video
            src={partenaire.couverture}
            autoPlay
            loop
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", }}
          />
          
        ) : (
          <img
            src={partenaire.couverture}
            alt={partenaire.nomEntreprise}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      <div 
          style={{
            position: "absolute",
            inset: 3,               // Prend 100% de la place (0px du haut, bas, gauche, droite)
            pointerEvents: "none",  // Permet de cliquer à travers (ne bloque pas les contrôles vidéo)
            borderRadius: "inherit", // Hérite des 40px d'arrondi du parent
            
            // Application de tes bordures à l'intérieur
            borderStyle: "solid",
            borderColor: "#FFFFFF99",
            borderWidth: "2px 1.5px 0.7px 1.5px", 
            
            zIndex: 2               // Reste bien au-dessus de l'image/vidéo
          }} 
        />
{/* 3. CONTENEUR PRINCIPAL (Prend toute la hauteur, sans masque pour ne rien cacher) */}
<div 
  style={{ 
    position: "absolute", 
    top: 0,
    bottom: 0, 
    left: 0, 
    right: 0, 
    height: "100%", 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", // Centre parfaitement le logo et les textes au milieu vertical global
    zIndex: 3,
  }}
>
  {/* A. LE FOND FLOU ISOLE (Placé en arrière-plan absolu) */}
  <div style={{
    position: "absolute",
    inset: 0,
    zIndex: -1, // Reste derrière le logo et les textes
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.01) 100%)",
    // Le masque est appliqué UNIQUEMENT sur ce fond, donc il ne coupera plus jamais le logo
    maskImage: "linear-gradient(to bottom, transparent 0%, transparent 60%, black 65%, black 100%)",
    WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, transparent 60%, black 65%, black 100%)",
  }} />

  {/* B & C: LOGO ET TEXTES (Regroupés pour être descendus ensemble) */}
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: "translateY(100px)", zIndex: 4 }}>
    {/* B. LE LOGO (Maintenant 100% visible et net) */}
    <div style={{ width: 88.88, height: 88.88, backgroundColor: "white", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0px 4px 12px rgba(0,0,0,0.1)", marginBottom: 16, overflow: "hidden", padding: 2 }}>
      <img src={partenaire.brandLogo || "/logo.png"} alt="" style={{ width: "82.22px", height: "82.22px", objectFit: "contain", border: "0.2px solid #00000014", borderRadius: "18px", boxShadow: "0px 2.22px 2.22px -1.11px #0A0D120A, 0px 13.33px 26.67px -6.67px #0A0D122E"}} />
    </div>
    
    {/* C. LES TEXTES */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* NOM DE L'ENTREPRISE */}
      <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: "#FFFFFF", margin: "0 0 4px 0", textAlign: "center", letterSpacing: "-0.02em" }}>
        {partenaire.nomEntreprise}
      </h1>

      {/* SOUS-TITRE */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.9 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, color: "#FFFFFF" }}>
          Depuis 2022 • Verified by withyou
        </span>
        <img src="/cachet.png" alt="" style={{ width: 20, height: 20, boxShadow: "0.42px 0.42px 0.84px 0px #00000030, 1.26px 1.26px 1.68px 0px #0000002B, 2.53px 3.37px 2.53px 0px #0000001A, 4.21px 5.47px 2.95px 0px #00000008, 6.74px 8.84px 2.95px 0px #00000000"}} />
      </div>
    </div>
  </div>

</div>
</div>

      {/* Historique */}
      <div className="p-4" style={{ display: "flex", flexDirection: "column", gap: "8px", backgroundColor:  partenaire.div_color , borderRadius: "16px", margin: "16px", position: "relative", overflow: "hidden" }}>
        
        <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", letterSpacing: "-0.04%", color: partenaire.text_color }}>
         L'histoire qu'ils partagent
        </h2>
        <div className="absolute pointer-events-none" style={{ right: 10, top: -15, width: 33, height: 55, transform: "rotate(240.0deg)", transformOrigin: "center center" }}>
            <img src="/rose.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        <p
          style={{
            fontSize: "14px",
            lineHeight: "150%",
            color: partenaire.secondtext_color,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: histoireExpanded ? "unset" : 3,
            overflow: histoireExpanded ? "visible" : "hidden",
          }}
        >
          {partenaire.histoire}
        </p>

        {partenaire.histoire && (
          <button
            onClick={() => setHistoireExpanded((prev) => !prev)}
            style={{
              alignSelf: "flex-start",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              color: partenaire.text_color,
              letterSpacing: "-0.02em",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            {histoireExpanded ? "Voir moins" : "Voir plus"}
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Minimalist Vocal Player */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
              {/* Play Button */}
              <button 
                style={{ 
                  background: "none", 
                  border: "none", 
                  padding: 0, 
                  display: "flex", 
                  alignItems: "center", 
                  cursor: "pointer" 
                }}
              >
                <svg width="18" height="20" viewBox="0 0 18 20" fill={partenaire.secondtext_color}>
                  <path d="M2 2L16 10L2 18V2Z" style={{ stroke: partenaire.secondtext_color, strokeWidth: "2", strokeLinejoin: "round" }} />
                </svg>
              </button>

              {/* Waveform */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "20px" }}>
                {[6, 10, 8, 14, 18, 12, 16, 14, 10, 12, 8, 6].map((h, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      width: "2.5px", 
                      height: `${h}px`, 
                      backgroundColor: partenaire.secondtext_color, 
                      borderRadius: "2px",
                      opacity: i > 8 ? 0.4 : 1 // Simulation de progression
                    }} 
                  />
                ))}
              </div>

              {/* Duration Text */}
              <span 
                style={{ 
                  fontFamily: "Inter, sans-serif", 
                  fontSize: "15px", 
                  color: partenaire.secondtext_color, 
                  marginLeft: "4px",
                  letterSpacing: "-0.01em"
                }}
              >
                27 sec
              </span>
            </div>
          </div>
          
          {/* Author Name */}
          <p style={{ 
            fontFamily: "var(--font-meow-script), cursive", 
            fontWeight: 400, 
            fontSize: "18px", 
            color: partenaire.text_color,
            margin: 0
          }}>
            Saloi Djedid
          </p>
        </div>
      </div>

      {/* D'où vient la marque */}
      <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        

        <div 
          style={{ 
            backgroundColor: partenaire.div_color, 
            borderRadius: "28px", 
            padding: "20px", 
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
           <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", letterSpacing: "-0.04%", color: partenaire.text_color }}>
             D&apos;où vient la marque
        </h2>
          
        <div 
          style={{ 
            backgroundColor: partenaire.div_color, 
            borderRadius: "24px", 
            padding: "20px", 
            border: "1px solid " + partenaire.bordercolor,
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
        >
          <p style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "16px",
            fontWeight: 500,
            color: partenaire.text_color,
            margin: 0,
            letterSpacing: "-0.03%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
            Fondée en 2022 par {partenaire.prenomFondateur} {partenaire.nomFondateur} à {partenaire.wilaya}...
          </p>
          <div 
           style={{ 
            position: "relative", 
            width: "313px", 
            height: "91px", 
            border:"2.82px solid " + partenaire.bordercolor,
            borderRadius: "20px", 
            overflow: "hidden", 
            boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"

          }}
          >
          {/* 1. LA CARTE DE LA WILAYA */}
          {partenaire.wilaya && <WilayaMap wilaya={partenaire.wilaya} mode={partenaire.mapmode} />}
          
          {/* 2. 🔥 LE FILTRE VERT D'EAU (Placé INSIDE le conteneur, uniquement en mode light) */}
          {partenaire.mapmode !== "dark" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#72BBA6", // Ton vert d'eau
                opacity: 0.3,               // Utilisation de l'opacité pour forcer le filtre visuel
                pointerEvents: "none",
                zIndex: 1000                  // Passe par-dessus la map
              }}
            />
          )}

          {/* 3. 🔥 LA BORDURE INTÉRIEURE (Placée AUSSI inside le conteneur) */}
          <div 
            style={{
              position: "absolute",
              inset: "3px",               
              pointerEvents: "none",  
              borderRadius: "17px",       // Un poil plus petit que 20px pour suivre l'arrondi du cadre à cause du inset 3px
              borderStyle: "solid",
              borderColor: "#FFFFFF99",
              borderWidth: "2px 1.5px 0px 1.5px", 
              zIndex: 1002                   // Reste au premier plan par-dessus le filtre
            }} 
          />
        </div>
            </div> {/* Déplacement de la fermeture ici pour englober tout le monde */}
        </div>
      </div>

        {/* Les visage  */}
      <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        

        <div className="bordercolor: partenaire.bordercolor;"
          style={{ 
            backgroundColor: partenaire.div_color, 
            borderRadius: "28px", 
            padding: "12px", 
            width: "100%",
            height: "auto",                    // 1. Force la boîte à s'adapter à la hauteur de son contenu
             boxSizing: "border-box",
            border: "1px solid partenaire.bordercolor",
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflow: "hidden"
          }}
        >
           <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", letterSpacing: "-0.04%", color: partenaire.text_color }}>
             Les visage de {partenaire.nomEntreprise}
        </h2>
          <div 
              style={{ 
                display: "flex",   
                flexDirection: "row",            // Aligne les cartes côte à côte
                gap: "16px",              // Ajoute un espace entre vos deux div
                width: "100%",
                boxSizing: "border-box"
              }}
            >
        <div 
          style={{ 
           
            backgroundColor: partenaire.div_color, 
            borderRadius: "24px", 
            padding: "16px", 
            border: `1px solid ${partenaire.bordercolor}`,
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
         >
          <p style={{ 
            fontFamily: "Inter, sans-serif", 
            fontSize: "14px", 
            fontWeight: 500, 
            color: partenaire.text_color, 
            margin: 0,
            letterSpacing: "-0.03%",
            textAlign: "left"
          }}>
            {partenaire.prenomFondateur} {partenaire.nomFondateur} 
          </p>
         <span style={{
            fontFamily: "Inter, sans-serif", 
            fontSize: "12px", 
            fontWeight: 500, 
            color: partenaire.secondtext_color,
            marginTop: -15,
            letterSpacing: "-0.03%",
            textAlign: "left"
         }}>
          {partenaire.visage1role}
         </span>
         <div
          style={{ 
            position: "relative", 
            width: "139.5px", 
            height: "122px", 
            border:"1px solid " + partenaire.bordercolor,
            borderRadius: "20px", 
            overflow: "hidden", 
            marginTop: "-10px",
            alignSelf: "center",
            zIndex: 5, 
            boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"

          }}
          >
          {/* 1. LA CARTE DE LA WILAYA */}
          {partenaire.visge1 && <img src={partenaire.visge1} alt="Visage 1" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
           <div 
            style={{
              position: "absolute",
              inset: "10px",  
              top: "1.77px", 
              left: "1.88px",  
              right: "1.88px",           
              pointerEvents: "none",  
              borderRadius: "17px",       // Un poil plus petit que 20px pour suivre l'arrondi du cadre à cause du inset 3px
              borderStyle: "solid",
              borderColor: partenaire.bordercolor,
              borderWidth: "0.7px 0.7px 0px 0.7px", 
              zIndex: 10                   // Reste au premier plan par-dessus le filtre
            }} 
          /> 
         </div>
        
        
        </div>
        <div 
          style={{ 
        
            backgroundColor: partenaire.div_color, 
            borderRadius: "24px", 
            padding: "12px", 
            border: `1px solid ${partenaire.bordercolor}`,
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}
         >
          <p style={{ 
            fontFamily: "Inter, sans-serif", 
            fontSize: "14px", 
            fontWeight: 500, 
            color: partenaire.text_color, 
            margin: 0,
            letterSpacing: "-0.03%",
            textAlign: "left",
            
            // --- Propriétés à ajouter pour les points de suspension ---
            maxWidth: "150px",          // Limite la largeur (ajustez la valeur selon vos besoins en px ou en %)
            whiteSpace: "nowrap",       // Empêche le texte de passer à la ligne
            overflow: "hidden",         // Cache ce qui dépasse
            textOverflow: "ellipsis"    // Ajoute le "..."
          }}>
            {partenaire.visge2nomprenom} 
          </p>
         <span style={{
            fontFamily: "Inter, sans-serif", 
            fontSize: "12px", 
            fontWeight: 500, 
            color: partenaire.secondtext_color,
            marginTop: -15,
            letterSpacing: "-0.03%",
            textAlign: "left"
         }}>
          {partenaire.visage2role}
         </span>
         <div
          style={{ 
            position: "relative", 
            width: "139.5px", 
            height: "122px", 
            border:"1px solid #0000001A",
            borderRadius: "20px", 
            overflow: "hidden", 
            marginTop: "-10px",
            alignSelf: "center",
            zIndex: 5, 
            boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"

          }}
          >
         
          {partenaire.visge2 && <img src={partenaire.visge2} alt="Visage 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
           <div 
            style={{
              position: "absolute",
              inset: "10px",  
              top: "1.77px", 
              left: "1.88px",  
              right: "1.88px",           
              pointerEvents: "none",  
              borderRadius: "17px",       // Un poil plus petit que 20px pour suivre l'arrondi du cadre à cause du inset 3px
              borderStyle: "solid",
              borderColor: "#FFFFFF99",
              borderWidth: "0.7px 0.7px 0px 0.7px", 
              zIndex: 10                   // Reste au premier plan par-dessus le filtre
            }} 
          /> 
         </div>
        
        
        </div>
        
            </div> {/* Déplacement de la fermeture ici pour englober tout le monde */}
            
        </div>

      </div>
      <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        

        <div 
          style={{ 
            backgroundColor: partenaire.div_color, 
            borderRadius: "28px", 
            padding: "12px", 
            width: "100%",
            height: "auto",                    // 1. Force la boîte à s'adapter à la hauteur de son contenu
             boxSizing: "border-box",
            border: `1px solid ${partenaire.bordercolor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflow: "hidden"
          }}
         >
           <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", letterSpacing: "-0.04%", color: partenaire.text_color }}>
             Leurs engagements
                </h2>
                  <div 
                      style={{ 
            display: "grid",   
            gridTemplateColumns: "repeat(2, 1fr)", // Crée 2 colonnes de taille égale (50% / 50%)
            gap: "16px",                           // Espace horizontal ET vertical entre les 4 div
            width: "100%",
            boxSizing: "border-box"
          }}
                    >
                <div 
                  style={{ 
                  
                    backgroundColor: partenaire.div_color, 
                    borderRadius: "16px", 
                    padding: "16px 8px 16px 8px", 
                    border: `1px solid ${partenaire.bordercolor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                      <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",          // Un peu plus grand que le SVG pour donner de l'air
          height: "24px",
          backgroundColor: "transparent" ,// Fond transparent, sans cadre
          color: partenaire.text_color
          }}>
            <SparkleStar color={partenaire.text_color} />
          </div>
          <p style={{ 
            fontFamily: "Inter, sans-serif", 
            fontSize: "14px", 
            fontWeight: 500, 
            color: partenaire.text_color, 
            margin: 0,
            letterSpacing: "-0.03%",
            textAlign: "left"
          }}>
            {partenaire.engagement1} 
          </p>
        
         
        
        
                  </div>
                  <div 
                    style={{ 
                    
                      backgroundColor: partenaire.div_color, 
                      borderRadius: "16px", 
                      padding: "16px 8px 16px 8px", 
                      border: `1px solid ${partenaire.bordercolor}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                    <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",          // Un peu plus grand que le SVG pour donner de l'air
            height: "24px",
            backgroundColor: "transparent" // Fond transparent, sans cadre
          }}>
            <SparkleStar color={partenaire.text_color} />
          </div>
            <p style={{ 
              fontFamily: "Inter, sans-serif", 
              fontSize: "14px", 
              fontWeight: 500, 
              color: partenaire.text_color, 
              margin: 0,
              letterSpacing: "-0.03%",
              textAlign: "left"
            }}>
              {partenaire.engagement2} 
            </p>
          
         
        
        
            </div>
            <div 
              style={{ 
              
                backgroundColor: partenaire.div_color, 
                borderRadius: "16px", 
                padding: "16px 8px 16px 8px", 
                border: `1px solid ${partenaire.bordercolor}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",          // Un peu plus grand que le SVG pour donner de l'air
                height: "24px",
                backgroundColor: "transparent" // Fond transparent, sans cadre
              }}>
                <SparkleStar color={partenaire.text_color} />
              </div>
              <p style={{ 
                fontFamily: "Inter, sans-serif", 
                fontSize: "14px", 
                fontWeight: 500, 
                color: partenaire.text_color, 
                margin: 0,
                letterSpacing: "-0.03%",
                textAlign: "left"
              }}>
                {partenaire.engagement3} 
              </p>
            
            
            
            
              </div>
              <div 
                style={{ 
                
                  backgroundColor: partenaire.div_color, 
                  borderRadius: "16px", 
                  padding: "16px 8px 16px 8px", 
                  border: `1px solid ${partenaire.bordercolor}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",          // Un peu plus grand que le SVG pour donner de l'air
                height: "24px",
                backgroundColor: "transparent" // Fond transparent, sans cadre
              }}>
                <SparkleStar color={partenaire.text_color} />
              </div>
                        <p style={{ 
                          fontFamily: "Inter, sans-serif", 
                  fontSize: "14px", 
                  fontWeight: 500, 
                  color: partenaire.text_color, 
                  margin: 0,
                  letterSpacing: "-0.03%",
                  textAlign: "left"
                }}>
                  {partenaire.engagement4} 
                </p>
              
              
          
          
          </div>
            </div> {/* Déplacement de la fermeture ici pour englober tout le monde */}
            
        </div>
                <div 
          style={{ 
            backgroundColor: partenaire.div_color, 
            borderRadius: "28px", 
            padding: "12px", 
            width: "100%",
            height: "auto",                    // 1. Force la boîte à s'adapter à la hauteur de son contenu
             boxSizing: "border-box",
            border: `1px solid ${partenaire.bordercolor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflow: "hidden"
          }}
         >
           <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", letterSpacing: "-0.04%", color: partenaire.text_color }}>
             Pour quels besoins ?
                </h2>
                  <div 
                      style={{ 
            display: "grid",   
            gridTemplateColumns: "repeat(2, 1fr)", // Crée 2 colonnes de taille égale (50% / 50%)
            gap: "16px",                           // Espace horizontal ET vertical entre les 4 div
            width: "100%",
            boxSizing: "border-box"
          }}
                    >
                <div 
                  style={{ 
                  
                    backgroundColor: partenaire.div_color, 
                    borderRadius: "16px", 
                    padding: "16px 8px 16px 8px", 
                    border: `1px solid ${partenaire.bordercolor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                      
          <p style={{ 
            fontFamily: "Inter, sans-serif", 
            fontSize: "14px", 
            fontWeight: 500, 
            color: partenaire.text_color, 
            margin: 0,
            letterSpacing: "-0.03%",
            textAlign: "left"
          }}>
            {partenaire.besoin1} 
          </p>
           <div
          style={{ 
            position: "relative", 
            width: "139.5px", 
            height: "122px", 
            border:`1px solid ${partenaire.bordercolor}`,
            borderRadius: "20px", 
            overflow: "hidden", 
            marginTop: "-10px",
            alignSelf: "center",
            zIndex: 5, 
            boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"

          }}
          >
         
          {partenaire.besoin1 && <img src={partenaire.besoin1img} alt="Visage 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
           <div 
            style={{
              position: "absolute",
              inset: "10px",  
              top: "1.77px", 
              left: "1.88px",  
              right: "1.88px",           
              pointerEvents: "none",  
              borderRadius: "17px",       // Un poil plus petit que 20px pour suivre l'arrondi du cadre à cause du inset 3px
              borderStyle: "solid",
              borderColor: partenaire.bordercolor,
              borderWidth: "0.7px 0.7px 0px 0.7px", 
              zIndex: 10                   // Reste au premier plan par-dessus le filtre
            }} 
          /> 
         </div>
         {partenaire.besoin1 && (
           <button
             style={{
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               alignSelf: "center",
               padding: "6px 28px",
               borderRadius: "999px",
               background: "#FBFFFC",
               border: "2px solid #E4E7EC",
               boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
               fontFamily: "Inter, sans-serif",
               fontSize: "14px",
               fontWeight: 500,
               color: "#07320D",
               cursor: "pointer",
               transition: "all 0.2s ease",
               marginTop: "8px",
               width: "139.5px"
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.backgroundColor = "#F9FAFB";
               e.currentTarget.style.transform = "scale(1.03)";
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.backgroundColor = "#FFFFFF";
               e.currentTarget.style.transform = "scale(1)";
             }}
           >
             Voir
           </button>
         )}
         
         
        
        
                  </div>
                  <div 
                    style={{ 
                    
                      backgroundColor: partenaire.div_color, 
                      borderRadius: "16px", 
                      padding: "16px 8px 16px 8px", 
                      border: "1px solid " + partenaire.bordercolor,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px"
                    }}
                  >
                   
            <p style={{ 
              fontFamily: "Inter, sans-serif", 
              fontSize: "14px", 
              fontWeight: 500, 
              color: partenaire.text_color, 
              margin: 0,
              letterSpacing: "-0.03%",
              textAlign: "left"
            }}>
              {partenaire.besoin2} 
            </p>
          
          <div
          style={{ 
            position: "relative", 
            width: "139.5px", 
            height: "122px", 
            border:`1px solid ${partenaire.bordercolor}`,
            borderRadius: "20px", 
            overflow: "hidden", 
            marginTop: "-10px",
            alignSelf: "center",
            zIndex: 5, 
            boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"

          }}
          >
         
          {partenaire.besoin2 && <img src={partenaire.besoin2img} alt="Visage 2" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
           <div 
            style={{
              position: "absolute",
              inset: "10px",  
              top: "1.77px", 
              left: "1.88px",  
              right: "1.88px",           
              pointerEvents: "none",  
              borderRadius: "17px",       // Un poil plus petit que 20px pour suivre l'arrondi du cadre à cause du inset 3px
              borderStyle: "solid",
              borderColor: partenaire.bordercolor,
              borderWidth: "0.7px 0.7px 0px 0.7px", 
              zIndex: 10                   // Reste au premier plan par-dessus le filtre
            }} 
          /> 
         </div>
         {partenaire.besoin2 && (
           <button
             style={{
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               alignSelf: "center",
               padding: "6px 28px",
               borderRadius: "999px",
               background: "#FFFFFF",
               border: "1.13px solid #E4E7EC",
               boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
               fontFamily: "Inter, sans-serif",
               fontSize: "14px",
               fontWeight: 500,
               color: "#07320D",
               cursor: "pointer",
               transition: "all 0.2s ease",
               marginTop: "8px",
               width: "139.5px"
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.backgroundColor = "#F9FAFB";
               e.currentTarget.style.transform = "scale(1.03)";
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.backgroundColor = "#FFFFFF";
               e.currentTarget.style.transform = "scale(1)";
             }}
           >
             Voir
           </button>
         )}
            </div>
            <div 
              style={{ 
              
                backgroundColor: partenaire.div_color, 
                borderRadius: "16px", 
                padding: "16px 8px 16px 8px", 
                border: `1px solid ${partenaire.bordercolor}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              
              <p style={{ 
                fontFamily: "Inter, sans-serif", 
                fontSize: "14px", 
                fontWeight: 500, 
                color: partenaire.text_color, 
                margin: 0,
                letterSpacing: "-0.03%",
                textAlign: "left"
              }}>
                {partenaire.besoin3} 
              </p>
            <div
          style={{ 
            position: "relative", 
            width: "139.5px", 
            height: "122px", 
            border:`1px solid ${partenaire.bordercolor}`,
            borderRadius: "20px", 
            overflow: "hidden", 
            marginTop: "-10px",
            alignSelf: "center",
            zIndex: 5, 
            boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"

          }}
          >
         
          {partenaire.besoin3 && <img src={partenaire.besoin3img} alt="Visage 3" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
           <div 
            style={{
              position: "absolute",
              inset: "10px",  
              top: "1.77px", 
              left: "1.88px",  
              right: "1.88px",           
              pointerEvents: "none",  
              borderRadius: "17px",       // Un poil plus petit que 20px pour suivre l'arrondi du cadre à cause du inset 3px
              borderStyle: "solid",
               zIndex: 10                   // Reste au premier plan par-dessus le filtre
             }} 
           /> 
          </div>
          {partenaire.besoin3 && (
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                padding: "6px 28px",
                borderRadius: "999px",
                background: "#FFFFFF",
                border: "1.13px solid #E4E7EC",
                boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
                fontFamily: "Inter, sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: "#07320D",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginTop: "8px",
                width: "139.5px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F9FAFB";
                e.currentTarget.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Voir
            </button>
          )}
              </div>
              {partenaire.besoin4 && (
                <div
                  style={{
                    backgroundColor: partenaire.div_color,
                    borderRadius: "16px",
                    padding: "16px 8px 16px 8px",
                    border: `1px solid ${partenaire.bordercolor}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  <p style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: partenaire.text_color,
                    margin: 0,
                    letterSpacing: "-0.03%",
                    textAlign: "left"
                  }}>
                    {partenaire.besoin4}
                  </p>
                  <div
                    style={{
                      position: "relative",
                      width: "139.5px",
                      height: "122px",
                      border: `1px solid ${partenaire.bordercolor}`,
                      borderRadius: "20px",
                      overflow: "hidden",
                      marginTop: "-10px",
                      alignSelf: "center",
                      zIndex: 5,
                      boxShadow: "1px 1px 3px 0px #0000000A,4px 4px 6px 0px #00000008,9px 9px 8px 0px #00000005,16px 17px 9px 0px #00000003,24px 26px 10px 0px #00000000"
                    }}
                  >
                    <img src={partenaire.besoin4img} alt="Besoin 4" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <div
                      style={{
                        position: "absolute",
                        inset: "10px",
                        top: "1.77px",
                        left: "1.88px",
                        right: "1.88px",
                        pointerEvents: "none",
                        borderRadius: "17px",
                        borderStyle: "solid",
                        borderColor: partenaire.bordercolor,
                        borderWidth: "0.7px 0.7px 0px 0.7px",
                        zIndex: 10
                      }}
                    />
                  </div>
                  <button
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: "center",
                      padding: "6px 28px",
                      borderRadius: "999px",
                      background: "#FFFFFF",
                      border: "1.13px solid #E4E7EC",
                      boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#07320D",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      marginTop: "8px",
                      width: "139.5px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F9FAFB";
                      e.currentTarget.style.transform = "scale(1.03)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#FFFFFF";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    Voir
                  </button>
                </div>
              )}
            </div> {/* Déplacement de la fermeture ici pour englober tout le monde */}

        </div>
      </div>

      {/* Produits de la marque */}
      <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            backgroundColor: partenaire.div_color,
            borderRadius: "28px",
            overflow: "hidden",
            border: `1px solid ${partenaire.bordercolor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            padding: "10px",
          }}
        >
          <ProductSlider title="Leurs produits" hideBrandRow titleColor={partenaire.text_color} cardColor={partenaire.div_color} textColor={partenaire.text_color} />
        </div>
      </div>

      

      {/* Avis */}
      <div className="px-4 pb-8" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            backgroundColor: partenaire.div_color,
            borderRadius: "28px",
            padding: "12px",
            width: "100%",
            boxSizing: "border-box",
            border: `1px solid ${partenaire.bordercolor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "0px",
            overflow: "hidden",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: "20px", lineHeight: "105%", letterSpacing: "-0.04%", color: partenaire.text_color, padding: "4px 4px 12px 4px" }}>
            Ce que disent les clientes
          </h2>

          {/* Avis 1 */}
          <div style={{ display: "flex", flexDirection: "column", padding: "16px", backgroundColor: partenaire.div_color, border: `1px solid ${partenaire.bordercolor}`, borderRadius: 24, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: "12px", overflow: "hidden", border: `1.07px solid ${partenaire.bordercolor}`, flexShrink: 0 }}>
                <img src="/Avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <img 
                src="/fleure-profile.png" 
                alt="" 
                style={{ 
                  position: "absolute", // Positionnement absolu par rapport au parent
                  width: "30px",       // Taille de la fleur (ajustez)
                  height: "30px",
                  bottom: "815px",      // Position en bas (ajustez pour dépasser ou non)
                  left: "100px",       // Position à droite (ajustez pour dépasser ou non)
                  objectFit: "contain",
                  zIndex: 10          // Assure que la fleur est par-dessus
                }} 
              />
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: partenaire.text_color, margin: 0 }}>
                    Asma Khe
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 stroke-[#4CA30D]" />
                  </div>
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: partenaire.secondtext_color, lineHeight: "20px", margin: 0 }}>
                  J&apos;ai adoré cette marque ! Les produits ont vraiment amélioré l&apos;aspect de ma peau, je recommande vivement.
                </p>
              </div>
            </div>
          </div>

          {/* Avis 2 */}
          <div style={{ display: "flex", flexDirection: "column", padding: "16px", backgroundColor: partenaire.div_color, border: `1px solid ${partenaire.bordercolor}`, borderRadius: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 72, height: 72, borderRadius: "12px", overflow: "hidden", border: `1.07px solid ${partenaire.bordercolor}`, flexShrink: 0 }}>
                <div style={{ width: 72, height: 72, borderRadius: "12px", overflow: "hidden", border: `1.07px solid ${partenaire.bordercolor}`, flexShrink: 0 }}>
                <img src="/Avatar.png" alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              </div>
               <img 
                src="/fleure-profile.png" 
                alt="" 
                style={{ 
                  position: "absolute", // Positionnement absolu par rapport au parent
                  width: "30px",       // Taille de la fleur (ajustez)
                  height: "30px",
                  bottom: "680px",      // Position en bas (ajustez pour dépasser ou non)
                  left: "100px",       // Position à droite (ajustez pour dépasser ou non)
                  objectFit: "contain",
                  zIndex: 10          // Assure que la fleur est par-dessus
                }} 
              />
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 6 }}>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: partenaire.text_color, margin: 0 }}>
                    Lina B
                  </p>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                    <Star className="w-4 h-4 fill-[#4CA30D] stroke-[#4CA30D]" />
                  </div>
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 400, color: partenaire.secondtext_color, lineHeight: "20px", margin: 0 }}>
                  Des soins d&apos;une qualité exceptionnelle, les rituels algériens ancestraux se sentent vraiment dans chaque produit.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* D'autres marques à découvrir */}
      <div className="px-4 pb-4 relative" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            backgroundColor: partenaire.div_color,
            borderRadius: "28px",
            overflow: "hidden",
            border: `1px solid ${partenaire.bordercolor}`,
            boxShadow: "0px 4px 20px rgba(0,0,0,0.03)",
            padding: "12px",
            paddingBottom: "12px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-playfair)",
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "105%",
              letterSpacing: "-0.04%",
              color: partenaire.text_color,
              paddingLeft: "16px",
              paddingRight: "16px",
              marginBottom: "12px",
            }}
          >
            D&apos;autres marques à découvrir
          </h2>
          <BrandSlider excludeSlug={slug} />
        </div>
      </div>

    </div>

  );
}