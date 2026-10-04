"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "./partnerApi";

/**
 * Loads data that needs the signed-in partner's Clerk token. `key` re-runs the
 * fetch when it changes (a filter, a period…); `reload()` refetches on demand.
 */
export function usePartnerData<T>(fetcher: (token: string) => Promise<T>, key: string = "") {
  const { getToken, isLoaded } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      setData(await fetcherRef.current(token));
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(apiErrorMessage(err, "Le serveur ne répond pas. Vérifiez que l'API est démarrée."));
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded) void reload();
  }, [isLoaded, reload, key]);

  return { data, loading, error: errorMessage !== null, errorMessage, reload, getToken };
}
