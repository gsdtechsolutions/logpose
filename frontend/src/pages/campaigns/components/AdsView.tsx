import { useMemo } from "react";
import type { CampaignData } from "@/services/campaigns";
import type { BlurState } from "./BlurToggle";
import { groupAdsFromCampaigns } from "./groupAdsFromCampaigns";
import { AdsTable } from "@/pages/ads/components/AdsTable";

interface AdsViewProps {
  campaigns: CampaignData[];
  columns: string[];
  blur: BlurState;
  tagsMap?: Record<string, string[]>;
  onToggle: (
    entityId: string,
    entityType: "campaign" | "adset" | "ad",
    active: boolean,
    campaignAccountId?: string,
    entityName?: string,
    metrics?: Record<string, number>,
    budget?: number,
  ) => Promise<void>;
}

export function AdsView({
  campaigns,
  columns,
  blur,
  tagsMap = {},
  onToggle,
}: AdsViewProps) {
  const ads = useMemo(() => groupAdsFromCampaigns(campaigns), [campaigns]);

  const handleToggleGroup = async (
    _adId: string,
    active: boolean,
    _allInstanceIds?: string[],
    _accountStr?: string,
    _adName?: string,
  ) => {
    const group = ads.find((a) => a.id === _adId);
    if (!group) return;

    for (const inst of group.instances) {
      await onToggle(inst.id, "ad", active, inst.account_id, inst.name);
    }
  };

  const handleToggleInstance = async (
    instanceId: string,
    active: boolean,
    accountId?: string,
    name?: string,
  ) => {
    await onToggle(instanceId, "ad", active, accountId, name);
  };

  return (
    <AdsTable
      data={ads}
      columns={columns}
      blur={blur}
      tagsMap={tagsMap}
      onToggle={handleToggleGroup}
      onToggleInstance={handleToggleInstance}
    />
  );
}
