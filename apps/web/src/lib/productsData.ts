export type Product = {
  id: number;
  brand: string;
  brandLogo: string | null;
  brandInitials: string | null;
  name: string;
  image: string;
  price: string;
  currency: string;
  fit: number;
  description: string;
  ingredients: string;
  keywords: string[];
};

export const PRODUCTS: Product[] = [
  {
    id: 1,
    brand: "Azul Cosmetique",
    brandLogo: "/azul-logo.svg",
    brandInitials: null,
    name: "Azar - Rituel Nettoyant Et Démaquillant Aux Huiles Précieuses",
    image: "/azul-product.webp",
    price: "2800",
    currency: "Dzd",
    fit: 92,
    description:
      "Un soin double-action nettoyant et démaquillant enrichi aux huiles précieuses. Élimine maquillage et impuretés tout en respectant le film hydrolipidique naturel de la peau.",
    ingredients: "Huile d'argan, Huile de rose, Eau florale de jasmin, Vitamine E",
    keywords: ["nettoyant", "démaquillant", "peau sèche", "peau mixte", "huile", "doux", "soin visage", "maquillage"],
  },
  {
    id: 2,
    brand: "Gateline",
    brandLogo: "/logo_gateline.jpg",
    brandInitials: null,
    name: "Sérum Clarifiant aux Plantes Naturelles (100ml)",
    image: "/gateline-product.jpg",
    price: "1200",
    currency: "Dzd",
    fit: 88,
    description:
      "Sérum concentré aux extraits de plantes naturelles qui unifie le teint, réduit les taches et illumine le visage. Formule légère à absorption rapide.",
    ingredients: "Extrait de réglisse, Niacinamide, Acide hyaluronique, Aloé vera",
    keywords: ["sérum", "taches", "éclat", "peau terne", "unifier", "teint", "hyperpigmentation", "peau grasse", "légère", "clarifiant"],
  },
  {
    id: 3,
    brand: "Dihya",
    brandLogo: "/Logo_dihya.jpg",
    brandInitials: null,
    name: "Soin Naturel Hydratant & Réparateur",
    image: "/dihya-product.jpg",
    price: "1800",
    currency: "Dzd",
    fit: 90,
    description:
      "Crème soin riche en actifs naturels qui hydrate en profondeur et répare la barrière cutanée. Idéale pour les peaux sèches à mixtes en quête de confort.",
    ingredients: "Beurre de karité, Huile d'argan, Extrait de calendula, Panthénol",
    keywords: ["hydratant", "hydratation", "peau sèche", "réparateur", "crème", "confort", "barrière cutanée", "naturel", "karité"],
  },
  {
    id: 4,
    brand: "Ivoire Natural Care",
    brandLogo: null,
    brandInitials: "IN",
    name: "Body Scrub Fleur de Coton - Gommage Corps",
    image: "/ivoire-product.svg",
    price: "950",
    currency: "Dzd",
    fit: 85,
    description:
      "Gommage corps exfoliant à base de fleurs de coton qui élimine les cellules mortes, lisse la peau et laisse une sensation de douceur. Convient aux peaux grasses et mixtes.",
    ingredients: "Sucre fin, Huile de coton, Extrait de fleur de coton, Glycérine",
    keywords: ["gommage", "exfoliant", "peau grasse", "peau mixte", "cellules mortes", "douceur", "corps", "scrub", "lisse"],
  },
  {
    id: 5,
    brand: "Aryana Beauty",
    brandLogo: null,
    brandInitials: "AB",
    name: "Retinol Complex Sérum - Anti-Âge Intensif",
    image: "/azul-product.webp",
    price: "3200",
    currency: "Dzd",
    fit: 87,
    description:
      "Sérum anti-âge au rétinol qui lisse les rides, raffermit la peau et stimule le renouvellement cellulaire. Formule adaptée aux peaux grasses et à tendance acnéique.",
    ingredients: "Rétinol 0.3%, Niacinamide, Acide hyaluronique, Peptides",
    keywords: ["anti-âge", "rides", "rétinol", "raffermissant", "peau grasse", "acné", "sérum", "renouvellement", "jeunesse"],
  },
  {
    id: 6,
    brand: "Azul Cosmetique",
    brandLogo: "/azul-logo.svg",
    brandInitials: null,
    name: "Thala - Rituel Hydratant Visage (50ml)",
    image: "/dihya-product.jpg",
    price: "2400",
    currency: "Dzd",
    fit: 91,
    description:
      "Crème hydratante légère qui apporte confort et éclat sans effet gras. Convient parfaitement aux peaux mixtes à grasses qui ont besoin d'hydratation sans film occlusif.",
    ingredients: "Eau thermale, Aloe vera, Acide hyaluronique, Extrait de jasmin",
    keywords: ["hydratant", "peau mixte", "peau grasse", "légère", "éclat", "sans gras", "visage", "confort", "jasmin"],
  },
  {
    id: 7,
    brand: "Dihya",
    brandLogo: "/Logo_dihya.jpg",
    brandInitials: null,
    name: "Crème Nourrissante Intense - Beurre de Karité",
    image: "/gateline-product.jpg",
    price: "1600",
    currency: "Dzd",
    fit: 89,
    description:
      "Crème ultra-nourrissante enrichie au beurre de karité pour les peaux très sèches et déshydratées. Apporte nutrition et protection longue durée.",
    ingredients: "Beurre de karité, Huile d'avocat, Cire d'abeille, Vitamine A",
    keywords: ["nourrissant", "peau sèche", "déshydraté", "karité", "protection", "crème", "intense", "nutrition", "corps visage"],
  },
  {
    id: 8,
    brand: "Gateline",
    brandLogo: "/logo_gateline.jpg",
    brandInitials: null,
    name: "Mousse Nettoyante Purifiante - Contrôle Sébum",
    image: "/ivoire-product.svg",
    price: "1100",
    currency: "Dzd",
    fit: 93,
    description:
      "Mousse nettoyante purifiante qui élimine en douceur impuretés et excès de sébum. Idéale pour les peaux grasses et à imperfections, elle resserre les pores visiblement.",
    ingredients: "Acide salicylique 1%, Zinc, Extrait de thé vert, Panthénol",
    keywords: ["nettoyant", "purifier", "peau grasse", "sébum", "pores", "imperfections", "acné", "mousse", "visage", "contrôle"],
  },
];

export function getProductById(id: number | string): Product | undefined {
  return PRODUCTS.find((p) => p.id === Number(id));
}