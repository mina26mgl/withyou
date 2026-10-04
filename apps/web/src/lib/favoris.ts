"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "./api";

/**
 * Favoris (cœur des cartes produit). Connectée : table wishlist via /users/me/favoris.
 * Sans compte : gardés sur l'appareil, puis envoyés au compte à la connexion.
 */
const STORAGE_KEY = "withyou:favoris";
const EMPTY: string[] = [];

let cache: string[] | null = null;
/** Compte dont les favoris sont chargés (null : favoris locaux). */
let loadedFor: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : les favoris restent en mémoire pour la session.
  }
}

function read(): string[] {
  if (!cache) cache = readLocal();
  return cache;
}

function set(ids: string[]) {
  cache = ids;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type GetToken = () => Promise<string | null>;

async function loadFromAccount(userId: string, getToken: GetToken) {
  const token = await getToken();
  const remote = await api.get<string[]>("/users/me/favoris", { token });
  // Favoris mis sans compte : rattachés au compte puis retirés de l'appareil.
  const local = readLocal().filter((id) => !remote.includes(id));
  const kept = await Promise.all(
    local.map((id) =>
      api.post(`/users/me/favoris/${id}`, undefined, { token }).then(
        () => id,
        () => null,
      ),
    ),
  );
  writeLocal([]);
  loadedFor = userId;
  set([...kept.filter((id): id is string => id !== null), ...remote]);
}

export function useFavoris(): { ids: string[]; toggle: (produitId: string) => void } {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || loadedFor === userId || loading) return;
    loading = loadFromAccount(userId, getToken)
      .catch((err) => console.error("Favoris indisponibles:", err))
      .finally(() => {
        loading = null;
      });
  }, [isLoaded, isSignedIn, userId, getToken]);

  const toggle = useCallback(
    (produitId: string) => {
      const before = read();
      const removing = before.includes(produitId);
      const next = removing ? before.filter((id) => id !== produitId) : [produitId, ...before];
      set(next);

      if (!isSignedIn) {
        writeLocal(next);
        return;
      }
      void (async () => {
        try {
          const token = await getToken();
          if (removing) await api.delete(`/users/me/favoris/${produitId}`, { token });
          else await api.post(`/users/me/favoris/${produitId}`, undefined, { token });
        } catch (err) {
          console.error("Favori non enregistré:", err);
          set(before);
        }
      })();
    },
    [isSignedIn, getToken],
  );

  return { ids, toggle };
}
