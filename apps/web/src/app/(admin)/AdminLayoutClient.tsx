"use client";

import { useCallback, useMemo } from "react";
import { AdminContext } from "@/components/admin/AdminContext";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoadError } from "@/components/partner/ui-blocks";
import { adminApi } from "@/lib/adminApi";
import { usePartnerData } from "@/lib/usePartnerData";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const me = usePartnerData((token) => adminApi.me(token));
  const overview = usePartnerData((token) => adminApi.overview(token));
  const reloadOverview = overview.reload;
  const refresh = useCallback(() => void reloadOverview(), [reloadOverview]);
  const reloadMe = me.reload;
  const refreshMe = useCallback(() => void reloadMe(), [reloadMe]);
  const value = useMemo(
    () => ({ me: me.data, overview: overview.data, refresh, refreshMe }),
    [me.data, overview.data, refresh, refreshMe],
  );

  return (
    <AdminContext.Provider value={value}>
      <AdminShell>
        {me.error ? <LoadError what="la console admin" message={me.errorMessage} /> : children}
      </AdminShell>
    </AdminContext.Provider>
  );
}
