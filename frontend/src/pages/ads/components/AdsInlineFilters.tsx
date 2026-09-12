import { useMemo } from "react";
import type { QuickFilter } from "@/components/QuickFiltersBadges";
import type { ValueFilter } from "@/components/ValueFiltersSection";

export interface AdFilterState {
  dateRange: {
    preset: "today" | "yesterday" | "3d" | "7d" | "30d" | "90d" | "all" | "custom";
    startDate: string;
    endDate: string;
  };
  status: string;
  account: string;
  tag: string;
  valueFilters: ValueFilter[];
}

export const defaultAdFilters: AdFilterState = {
  dateRange: { preset: "today", startDate: "", endDate: "" },
  status: "all",
  account: "all",
  tag: "all",
  valueFilters: [],
};

const datePresetLabels: Record<string, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "3d": "3 dias",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  all: "1 Ano",
};

function formatCustomLabel(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return "Personalizado";
  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

interface QuickFiltersOptions {
  filters: AdFilterState;
  accounts: { id: number; name?: string; account_id?: string }[];
  tags: string[];
}

export function useAdQuickFilters({ filters, accounts, tags }: QuickFiltersOptions) {
  return useMemo<QuickFilter[]>(() => {
    const datePreset = filters.dateRange.preset;
    const dateLabel =
      datePreset === "custom"
        ? formatCustomLabel(filters.dateRange.startDate, filters.dateRange.endDate)
        : datePresetLabels[datePreset] ?? "Hoje";

    const list: QuickFilter[] = [
      {
        key: "dateRange",
        label: "Hoje",
        value: datePreset,
        isActive: true,
        options: [],
        defaultValue: "today",
        extra: {
          startDate: filters.dateRange.startDate,
          endDate: filters.dateRange.endDate,
          displayLabel: dateLabel,
        },
      },
      {
        key: "status",
        label: "Status",
        value: filters.status,
        isActive: filters.status !== "all",
        options: [
          { value: "all", label: "Todos os status" },
          { value: "active", label: "Ativo" },
          { value: "paused", label: "Pausado" },
        ],
        defaultValue: "all",
      },
      {
        key: "account",
        label: "Conta",
        value: filters.account,
        isActive: filters.account !== "all",
        options: [
          { value: "all", label: "Todas as contas" },
          ...accounts.map((acc) => ({
            value: String(acc.id),
            label: acc.name || acc.account_id || `Conta ${acc.id}`,
          })),
        ],
        defaultValue: "all",
      },
    ];

    if (tags.length > 0) {
      list.push({
        key: "tag",
        label: "Tag",
        value: filters.tag,
        isActive: filters.tag !== "all",
        options: [
          { value: "all", label: "Todas as tags" },
          ...tags.map((t) => ({ value: t, label: t })),
        ],
        defaultValue: "all",
      });
    }

    for (const vf of filters.valueFilters) {
      list.push({
        key: `vf_${vf.id}`,
        label: vf.metric,
        value: `${vf.metric} ${vf.operator} ${vf.value}`,
        isActive: true,
        options: [],
      });
    }

    return list;
  }, [filters, accounts, tags]);
}
