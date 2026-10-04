"use client";

import { createContext, useContext } from "react";
import type { AdminMe, AdminOverview } from "@withyou/shared-types";

export interface AdminContextValue {
  me: AdminMe | null;
  overview: AdminOverview | null;
  /** Recharge les compteurs (menu, vue du jour) après une action. */
  refresh: () => void;
  /** Recharge mon profil (nom, photo) après une modification. */
  refreshMe: () => void;
}

export const AdminContext = createContext<AdminContextValue>({ me: null, overview: null, refresh: () => {}, refreshMe: () => {} });
export const useAdmin = () => useContext(AdminContext);
