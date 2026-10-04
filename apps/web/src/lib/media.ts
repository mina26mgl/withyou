"use client";
import { useEffect, useState } from "react";

export { brandCoverImage, isVideoUrl } from "@withyou/shared-utils";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Connexion lente (2G) ou mode « économie de données » : on affiche alors
 * l'image de couverture au lieu de charger la vidéo. false si le navigateur
 * ne renseigne pas la connexion.
 */
export function useSlowConnection(): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (!connection) return;
    setSlow(Boolean(connection.saveData) || ["slow-2g", "2g"].includes(connection.effectiveType ?? ""));
  }, []);
  return slow;
}
