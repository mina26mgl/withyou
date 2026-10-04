const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface TrackedEvent {
  type: "PAGE_VIEW" | "PRODUCT_OPEN" | "PRODUCT_KEPT" | "SEARCH";
  slug?: string;
  produitId?: string;
  query?: string;
  skinType?: string;
  wilaya?: string;
}

/**
 * Fire-and-forget behaviour event for brand analytics. It must never block or
 * break the page, so every failure is swallowed.
 */
export function trackEvent(event: TrackedEvent): void {
  try {
    void fetch(`${API_BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // analytics is best-effort
  }
}
