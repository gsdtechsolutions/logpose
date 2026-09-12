import { useState } from "react";
import {
  defaultCampaignFilters,
  type CampaignFilterState,
} from "./CampaignsInlineFilters";
import { computeDateRange } from "./dateHelpers";
import type { ValueFilter } from "@/components/ValueFiltersSection";

export function useCampaignFilterState(
  setSelectedAccountId: (id: number | undefined) => void,
  setDateStart: (start: string) => void,
  setDateEnd: (end: string) => void,
) {
  const [filters, setFilters] = useState<CampaignFilterState>(defaultCampaignFilters);

  const handleFilterChange = (key: string, value: string) => {
    if (key === "dateRange") {
      if (value.startsWith("custom|")) {
        const [, start, end] = value.split("|");
        setFilters((p) => ({ ...p, dateRange: { preset: "custom", startDate: start, endDate: end } }));
        setDateStart(start);
        setDateEnd(end);
      } else {
        setFilters((p) => ({ ...p, dateRange: { preset: value as any, startDate: "", endDate: "" } }));
        const range = computeDateRange(value);
        setDateStart(range.start);
        setDateEnd(range.end);
      }
    } else if (key === "status") setFilters((p) => ({ ...p, status: value }));
    else if (key === "objective") setFilters((p) => ({ ...p, objective: value }));
    else if (key === "account") {
      setFilters((p) => ({ ...p, account: value }));
      setSelectedAccountId(value === "all" ? undefined : Number(value));
    } else if (key === "bidStrategy") setFilters((p) => ({ ...p, bidStrategy: value }));
    else if (key === "budgetType") setFilters((p) => ({ ...p, budgetType: value }));
    else if (key === "product") setFilters((p) => ({ ...p, product: value }));
    else if (key === "video") setFilters((p) => ({ ...p, video: value }));
    else if (key === "checkout") setFilters((p) => ({ ...p, checkout: value }));
    else if (key === "tag") setFilters((p) => ({ ...p, tag: value }));
    else if (key.startsWith("vf_")) {
      const id = key.replace("vf_", "");
      setFilters((p) => ({ ...p, valueFilters: p.valueFilters.filter((f) => f.id !== id) }));
    }
  };

  const addValueFilter = (vf: ValueFilter) => {
    setFilters((p) => ({ ...p, valueFilters: [...p.valueFilters, vf] }));
  };

  return { filters, handleFilterChange, addValueFilter };
}
