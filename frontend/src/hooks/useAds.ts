import { useState, useCallback, useRef } from "react";
import { useCachedQuery } from "./useCachedQuery";
import { toast } from "sonner";
import {
  fetchAdsData,
  toggleAdStatus,
  type AdGroupData,
  type AdsResponse,
} from "@/services/ads";
import { useFacebookAccounts } from "./useFacebookAccounts";
import { invalidateCacheByPrefix } from "@/lib/queryCache";

export function useAds(dateStart: string, dateEnd: string) {
  const { accounts } = useFacebookAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, string>>({});
  const toggleInProgressRef = useRef<Set<string>>(new Set());

  const activeAccountId = selectedAccountId;

  const { data, isLoading, error, reload, silentReload } = useCachedQuery<AdsResponse>({
    cachePrefix: "ads",
    params: { dateStart, dateEnd, activeAccountId },
    queryFn: () => fetchAdsData(dateStart, dateEnd, activeAccountId),
    enabled: !!dateStart && !!dateEnd,
    autoRefreshMs: 30_000,
  });

  const applyOverrides = useCallback(
    (ads: AdGroupData[]): AdGroupData[] =>
      ads.map((ad) => {
        const groupOverride = optimisticOverrides[ad.id];
        const updatedInstances = ad.instances.map((inst) => {
          const instOverride = optimisticOverrides[inst.id] || groupOverride;
          return instOverride ? { ...inst, status: instOverride } : inst;
        });
        const anyActive = updatedInstances.some((i) => i.status === "active");
        return {
          ...ad,
          status: groupOverride || (anyActive ? "active" : "paused"),
          instances: updatedInstances,
        };
      }),
    [optimisticOverrides],
  );

  const toggle = async (
    adId: string,
    active: boolean,
    allInstanceIds?: string[],
    accountStr?: string,
    adName?: string,
  ) => {
    let targetAccountId = activeAccountId;
    if (accountStr) {
      const acc = accounts.find((a) => a.account_id === accountStr);
      if (acc) targetAccountId = acc.id;
    }

    if (!targetAccountId && accounts.length > 0) {
      targetAccountId = accounts[0].id;
    }

    if (!targetAccountId) {
      toast.error("Selecione uma conta", {
        description: "Para alterar o status do anúncio, selecione uma conta específica no filtro.",
      });
      return;
    }

    if (toggleInProgressRef.current.has(adId)) return;
    toggleInProgressRef.current.add(adId);

    const newStatus = active ? "active" : "paused";
    setOptimisticOverrides((prev) => ({ ...prev, [adId]: newStatus }));

    try {
      await toggleAdStatus(
        targetAccountId,
        adId,
        active,
        allInstanceIds,
        adName,
      );
      invalidateCacheByPrefix("ads");
      await silentReload();
    } catch (err: any) {
      setOptimisticOverrides((prev) => {
        const copy = { ...prev };
        delete copy[adId];
        return copy;
      });
      toast.error("Erro ao alterar status", {
        description: err.message || "Não foi possível sincronizar a alteração com o Facebook.",
      });
    } finally {
      toggleInProgressRef.current.delete(adId);
    }
  };

  const rawAds = data?.ads ?? [];
  const ads = applyOverrides(rawAds);

  return {
    ads,
    lastSyncAt: data?.last_sync_at,
    isLoading,
    error,
    accounts,
    activeAccountId,
    setSelectedAccountId,
    toggle,
    reload,
    silentReload,
  };
}
