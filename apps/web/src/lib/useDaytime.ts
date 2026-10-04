"use client";

import { useEffect, useState } from "react";

/** Soir de 18 h à 6 h, journée le reste du temps. */
const isEveningHour = (h: number) => h >= 18 || h < 6;

/**
 * Ciel du bandeau d'accueil (console admin et espace marque) : matin ou soir selon
 * l'heure du navigateur. Calculé après le montage pour ne pas dépendre de l'heure
 * du serveur, et réévalué toutes les 5 minutes si la page reste ouverte.
 */
export function useDaytime() {
  const [evening, setEvening] = useState(false);
  useEffect(() => {
    const update = () => setEvening(isEveningHour(new Date().getHours()));
    update();
    const id = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return {
    evening,
    greeting: evening ? "Bonsoir" : "Bonjour",
    skyImage: evening ? "/evening.png" : "/morning.png",
  };
}
