import { apiRequest } from "./api";

export interface AdInstanceData {
  id: string;
  name: string;
  status: string;
  ad_set_id: string;
  ad_set_name: string;
  campaign_id: string;
  campaign_name: string;
  account_id: string;
  spend: number;
  clicks: number;
  impressions: number;
  cpc: number;
  ctr: number;
  landing_page_views: number;
  initiate_checkout: number;
  connect_rate: number;
  sales: number;
  revenue: number;
  profit: number;
  roas: number;
  cpa: number;
  budget: number;
}

export interface AdGroupData {
  id: string;
  name: string;
  status: string;
  spend: number;
  revenue: number;
  profit: number;
  sales: number;
  roas: number;
  cpa: number;
  cpc: number;
  ctr: number;
  clicks: number;
  impressions: number;
  landing_page_views: number;
  initiate_checkout: number;
  connect_rate: number;
  budget: number;
  instances_count: number;
  campaigns_count: number;
  campaign_names: string[];
  instances: AdInstanceData[];
  account_id: string;
}

export interface AdsResponse {
  ads: AdGroupData[];
  last_sync_at?: string | null;
  error?: string | null;
}

export async function fetchAdsData(
  dateStart: string,
  dateEnd: string,
  accountId?: number,
): Promise<AdsResponse> {
  const params = new URLSearchParams({
    date_start: dateStart,
    date_end: dateEnd,
  });
  if (accountId) params.set("account_id", String(accountId));
  return apiRequest<AdsResponse>(`/ads/data?${params}`);
}

export async function toggleAdStatus(
  accountId: number,
  adId: string,
  active: boolean,
  adIds?: string[],
  entityName?: string,
  metrics?: Record<string, number>,
): Promise<{ status: string; new_status: string }> {
  return apiRequest("/ads/toggle", {
    method: "POST",
    body: {
      account_id: accountId,
      ad_id: adId,
      active,
      ad_ids: adIds,
      entity_name: entityName || "",
      metrics: metrics || {},
    },
  });
}
