import { useState, useMemo } from "react";
import type { AdGroupData } from "@/services/ads";

export type AdSortKey =
  | "spend" | "sales" | "revenue" | "profit" | "roas" | "cpa"
  | "cpc" | "ctr" | "clicks" | "impressions" | "lpv" | "ic"
  | "connectRate" | "budget" | null;

export const sortableColumns: Record<string, AdSortKey> = {
  spend: "spend",
  sales: "sales",
  revenue: "revenue",
  profit: "profit",
  roas: "roas",
  cpa: "cpa",
  cpc: "cpc",
  ctr: "ctr",
  clicks: "clicks",
  impressions: "impressions",
  lpv: "lpv",
  ic: "ic",
  connectRate: "connectRate",
  budget: "budget",
};

function getSortValue(ad: AdGroupData, key: AdSortKey): number {
  if (!key) return 0;
  const map: Record<string, number> = {
    spend: ad.spend,
    sales: ad.sales,
    revenue: ad.revenue,
    profit: ad.profit,
    roas: ad.spend > 0 ? ad.revenue / ad.spend : 0,
    cpa: ad.cpa,
    cpc: ad.cpc,
    ctr: ad.ctr,
    clicks: ad.clicks,
    impressions: ad.impressions,
    lpv: ad.landing_page_views,
    ic: ad.initiate_checkout,
    connectRate: ad.connect_rate,
    budget: ad.budget || 0,
  };
  return map[key] ?? 0;
}

export function useAdSort(ads: AdGroupData[]) {
  const [sortKey, setSortKey] = useState<AdSortKey>("spend");

  const sorted = useMemo(() => {
    if (!sortKey) return ads;
    return [...ads].sort((a, b) => getSortValue(b, sortKey) - getSortValue(a, sortKey));
  }, [ads, sortKey]);

  const toggleSort = (col: string) => {
    const key = sortableColumns[col] ?? null;
    setSortKey((prev) => (prev === key ? null : key));
  };

  return { sorted, sortKey, toggleSort };
}
