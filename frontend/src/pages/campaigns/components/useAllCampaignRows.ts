import { useMemo } from "react";
import type { CampaignData } from "@/services/campaigns";
import type { BlurState } from "./BlurToggle";

export function useAllCampaignRows(
  campaigns: CampaignData[],
  unidentified: CampaignData | null | undefined,
  blur: BlurState,
): CampaignData[] {
  const unidentifiedProducts = unidentified?.products ?? [];

  return useMemo(() => {
    const rows: CampaignData[] = [...campaigns];
    if (!unidentified || unidentified.sales <= 0) return rows;
    if (blur.hideUnidentified) return rows;

    if (blur.hiddenProducts.length > 0 && unidentifiedProducts.length > 0) {
      const visibleProducts = unidentifiedProducts.filter(
        (p) => !blur.hiddenProducts.includes(p.name),
      );
      if (visibleProducts.length === 0) return rows;
      const filteredSales = visibleProducts.reduce((s, p) => s + p.sales, 0);
      const filteredRevenue = visibleProducts.reduce((s, p) => s + p.revenue, 0);
      rows.push({
        ...unidentified,
        sales: filteredSales,
        revenue: filteredRevenue,
        profit: filteredRevenue,
      });
    } else {
      rows.push(unidentified);
    }
    return rows;
  }, [campaigns, unidentified, blur.hideUnidentified, blur.hiddenProducts, unidentifiedProducts]);
}
