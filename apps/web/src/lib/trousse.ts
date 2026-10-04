"use client";
import { useSyncExternalStore } from "react";
import type { PublicProduct } from "@withyou/shared-types";

/** Produit gardé dans la trousse (panier client), avec de quoi recalculer le fit. */
export interface TrousseItem {
  id: string;
  nom: string;
  prix: number;
  imageUrl: string | null;
  marque: { nom: string; logoUrl: string | null };
  skinTypes: string[];
  needs: string[];
  moment: string | null;
  quantite: number;
}

const STORAGE_KEY = "withyou:trousse";
const EMPTY: TrousseItem[] = [];

let cache: TrousseItem[] | null = null;
const listeners = new Set<() => void>();

function read(): TrousseItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as TrousseItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: TrousseItem[]) {
  cache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Stockage indisponible (navigation privée) : la trousse reste en mémoire.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function addToTrousse(product: PublicProduct, quantite = 1) {
  const items = read();
  const existing = items.find((i) => i.id === product.id);
  if (existing) {
    write(items.map((i) => (i.id === product.id ? { ...i, quantite: i.quantite + quantite } : i)));
    return;
  }
  write([
    ...items,
    {
      id: product.id,
      nom: product.nom,
      prix: product.prix,
      imageUrl: product.imagesUrls[0] ?? null,
      marque: { nom: product.marque.nom, logoUrl: product.marque.logoUrl },
      skinTypes: product.skinTypes,
      needs: product.needs,
      moment: product.moment,
      quantite,
    },
  ]);
}

export function setTrousseQuantite(id: string, quantite: number) {
  if (quantite < 1) return;
  write(read().map((i) => (i.id === id ? { ...i, quantite } : i)));
}

export function removeFromTrousse(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearTrousse() {
  write([]);
}

export function useTrousse(): TrousseItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
