import type { CampaignData } from "@/services/campaigns";
import type { AdGroupData, AdInstanceData } from "@/services/ads";

export function groupAdsFromCampaigns(campaigns: CampaignData[]): AdGroupData[] {
  const groups: Record<string, AdInstanceData[]> = {};

  for (const c of campaigns) {
    if (c.status === "unidentified") continue;
    for (const as_ of c.adsets || []) {
      for (const ad of as_.ads || []) {
        const key = (ad.name || "").trim().toLowerCase();
        if (!key) continue;

        const inst: AdInstanceData = {
          id: ad.id,
          name: ad.name,
          status: ad.status,
          ad_set_id: as_.id,
          ad_set_name: as_.name,
          campaign_id: c.id,
          campaign_name: c.name,
          account_id: c.account_id,
          spend: ad.spend,
          clicks: ad.clicks,
          impressions: ad.impressions,
          cpc: ad.cpc,
          ctr: ad.ctr,
          landing_page_views: ad.landing_page_views,
          initiate_checkout: ad.initiate_checkout,
          connect_rate: ad.connect_rate,
          sales: ad.sales,
          revenue: ad.revenue,
          profit: ad.profit,
          roas: ad.roas,
          cpa: ad.cpa,
          budget: ad.budget,
        };

        if (!groups[key]) groups[key] = [];
        groups[key].push(inst);
      }
    }
  }

  return Object.entries(groups).map(([key, instances]) => {
    const spend = instances.reduce((s, i) => s + i.spend, 0);
    const revenue = instances.reduce((s, i) => s + i.revenue, 0);
    const sales = instances.reduce((s, i) => s + i.sales, 0);
    const clicks = instances.reduce((s, i) => s + i.clicks, 0);
    const impressions = instances.reduce((s, i) => s + i.impressions, 0);
    const lpv = instances.reduce((s, i) => s + i.landing_page_views, 0);
    const ic = instances.reduce((s, i) => s + i.initiate_checkout, 0);
    const campNames = Array.from(new Set(instances.map((i) => i.campaign_name)));

    return {
      id: `adgroup_${key.replace(/\s+/g, "_")}`,
      name: instances[0].name,
      status: instances.some((i) => i.status === "active") ? "active" : "paused",
      spend,
      revenue,
      profit: revenue - spend,
      sales,
      roas: spend > 0 ? Number((revenue / spend).toFixed(2)) : 0,
      cpa: sales > 0 ? Number((spend / sales).toFixed(2)) : 0,
      cpc: clicks > 0 ? Number((spend / clicks).toFixed(2)) : 0,
      ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
      clicks,
      impressions,
      landing_page_views: lpv,
      initiate_checkout: ic,
      connect_rate: clicks > 0 ? Number(((lpv / clicks) * 100).toFixed(2)) : 0,
      budget: instances.reduce((s, i) => s + i.budget, 0),
      instances_count: instances.length,
      campaigns_count: campNames.length,
      campaign_names: campNames,
      instances,
      account_id: instances[0].account_id,
    };
  });
}
