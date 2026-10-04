"use client";
import { useEffect, useState } from "react";
import type { PublicProduct } from "@withyou/shared-types";
import { api } from "./api";

/** Catalogue client (produits en ligne des marques publiées) ; [] pendant le chargement. */
export function useOnlineProducts(): PublicProduct[] {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicProduct[]>("/produits")
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((err) => console.error("Produits indisponibles:", err));
    return () => {
      cancelled = true;
    };
  }, []);
  return products;
}
