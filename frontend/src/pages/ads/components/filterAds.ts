import type { AdGroupData } from "@/services/ads";
import type { AdFilterState } from "./AdsInlineFilters";
import type { ValueFilter } from "@/components/ValueFiltersSection";

function passesValueFilters(ad: AdGroupData, filters: ValueFilter[]): boolean {
  for (const f of filters) {
    const num = parseFloat(f.value);
    if (isNaN(num)) continue;
    const raw = (ad as Record<string, any>)[f.metric];
    const val = typeof raw === "number" ? raw : parseFloat(raw);
    if (isNaN(val)) continue;

    if (f.operator === ">=" || f.operator === "gte") {
      if (val < num) return false;
    } else if (f.operator === "<=" || f.operator === "lte") {
      if (val > num) return false;
    } else if (f.operator === ">" || f.operator === "gt") {
      if (val <= num) return false;
    } else if (f.operator === "<" || f.operator === "lt") {
      if (val >= num) return false;
    } else if (f.operator === "==" || f.operator === "eq") {
      if (val !== num) return false;
    }
  }
  return true;
}

export function filterAds(
  ads: AdGroupData[],
  search: string,
  filters: AdFilterState,
  tagsMap: Record<string, string[]> = {},
): AdGroupData[] {
  const query = search.trim().toLowerCase();

  return ads.filter((ad) => {
    if (query && !ad.name.toLowerCase().includes(query)) {
      return false;
    }

    if (filters.status !== "all" && ad.status !== filters.status) {
      return false;
    }

    if (filters.tag !== "all") {
      const adTags = tagsMap[ad.id] || [];
      if (!adTags.includes(filters.tag)) return false;
    }

    if (filters.account !== "all") {
      const hasAccount = ad.instances.some(
        (inst) => inst.account_id === filters.account
      );
      if (!hasAccount) return false;
    }

    if (filters.valueFilters.length > 0 && !passesValueFilters(ad, filters.valueFilters)) {
      return false;
    }

    return true;
  });
}
