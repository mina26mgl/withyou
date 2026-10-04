"use client";

import { createContext, useContext } from "react";
import type { PartnerSummary } from "@withyou/shared-types";

interface PartnerSummaryValue {
  summary: PartnerSummary | null;
  /** Refetch the sidebar identity and badges (after a rename, a reply…). */
  refresh: () => Promise<void>;
}

export const PartnerSummaryContext = createContext<PartnerSummaryValue>({
  summary: null,
  refresh: async () => {},
});

export const usePartnerSummary = () => useContext(PartnerSummaryContext);
