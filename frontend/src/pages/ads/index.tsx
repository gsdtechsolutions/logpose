import { useState, useMemo, useCallback } from "react";
import { AdsHeader } from "./components/AdsHeader";
import { AdsTable } from "./components/AdsTable";
import { AdsKpis } from "./components/AdsKpis";
import {
  defaultAdFilters,
  type AdFilterState,
  useAdQuickFilters,
} from "./components/AdsInlineFilters";
import { defaultPresets, type ColumnPreset } from "./components/columnPresets";
import type { BlurState } from "@/pages/campaigns/components/BlurToggle";
import { QuickFiltersBadges } from "@/components/QuickFiltersBadges";
import { AddValueFilterPopover } from "@/components/AddValueFilterPopover";
import { useAds } from "@/hooks/useAds";
import { useCampaignTags } from "@/hooks/useCampaignTags";
import { useCampaignPresets } from "@/hooks/useCampaigns";
import { useKpiColors } from "@/hooks/useKpiColors";
import { KpiColorsProvider } from "@/pages/campaigns/components/KpiColorsContext";
import { KpiColorsDrawer } from "@/pages/campaigns/components/KpiColorsDrawer";
import { PresetDrawer } from "@/pages/campaigns/components/PresetDrawer";
import { filterAds } from "./components/filterAds";
import { getDefaultDateRange, computeDateRange } from "@/pages/campaigns/components/dateHelpers";
import type { ValueFilter } from "@/components/ValueFiltersSection";
import { invalidateCacheByPrefix } from "@/lib/queryCache";
import { CampaignsLoading } from "@/pages/campaigns/components/CampaignsLoading";

const DEFAULT_PRESET_IDS = defaultPresets.map((p) => p.id);

export default function AdsPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AdFilterState>(defaultAdFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ColumnPreset | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blur, setBlur] = useState<BlurState>({
    name: false, values: false, hideUnidentified: false, hiddenProducts: [],
  });

  const { tagsMap, allUniqueTags } = useCampaignTags();
  const { kpiColors, save: saveKpiColors } = useKpiColors();

  const { presets: dbPresets, addPreset, editPreset, removePreset } = useCampaignPresets();
  const allPresets: ColumnPreset[] = useMemo(() => {
    const fromDb = dbPresets.map((p) => ({ id: String(p.id), name: p.name, columns: p.columns }));
    return [...defaultPresets, ...fromDb];
  }, [dbPresets]);
  const [activePresetId, setActivePresetId] = useState(defaultPresets[0].id);
  const activePreset = allPresets.find((p) => p.id === activePresetId) || allPresets[0];

  const defaultDR = getDefaultDateRange();
  const [dateStart, setDateStart] = useState(defaultDR.start);
  const [dateEnd, setDateEnd] = useState(defaultDR.end);

  const {
    ads, lastSyncAt, isLoading, error,
    accounts: fbAccounts, setSelectedAccountId,
    toggle, silentReload,
  } = useAds(dateStart, dateEnd);

  const handleRefresh = useCallback(async () => {
    invalidateCacheByPrefix("ads");
    await silentReload();
  }, [silentReload]);

  const filtered = useMemo(
    () => filterAds(ads, search, filters, tagsMap),
    [ads, search, filters, tagsMap],
  );

  const quickFilters = useAdQuickFilters({
    filters,
    accounts: fbAccounts,
    tags: allUniqueTags,
  });

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
    } else if (key === "status") {
      setFilters((p) => ({ ...p, status: value }));
    } else if (key === "account") {
      setFilters((p) => ({ ...p, account: value }));
      setSelectedAccountId(value === "all" ? undefined : Number(value));
    } else if (key === "tag") {
      setFilters((p) => ({ ...p, tag: value }));
    } else if (key.startsWith("vf_")) {
      const id = key.replace("vf_", "");
      setFilters((p) => ({ ...p, valueFilters: p.valueFilters.filter((f) => f.id !== id) }));
    }
  };

  const addValueFilter = (vf: ValueFilter) => {
    setFilters((p) => ({ ...p, valueFilters: [...p.valueFilters, vf] }));
  };

  const handleSavePreset = async (preset: ColumnPreset) => {
    if (editingPreset) {
      await editPreset(Number(preset.id), preset.name, preset.columns);
    } else {
      await addPreset(preset.name, preset.columns);
    }
    setEditingPreset(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-w-0">
      <AdsHeader
        search={search}
        onSearchChange={setSearch}
        presets={allPresets}
        activePresetId={activePresetId}
        onPresetChange={setActivePresetId}
        onCreatePreset={() => { setEditingPreset(null); setDrawerOpen(true); }}
        onEditPreset={(p) => { setEditingPreset(p); setDrawerOpen(true); }}
        onDeletePreset={async (id) => {
          await removePreset(Number(id));
          if (activePresetId === id) setActivePresetId(defaultPresets[0].id);
        }}
        blur={blur}
        onBlurChange={setBlur}
        onRefresh={handleRefresh}
        onOpenSettings={() => setSettingsOpen(true)}
        defaultPresetIds={DEFAULT_PRESET_IDS}
        lastSyncAt={lastSyncAt}
      />

      <AdsKpis data={filtered} />

      <div className="flex flex-wrap items-center gap-2">
        <QuickFiltersBadges filters={quickFilters} onChange={handleFilterChange} />
        <AddValueFilterPopover onAdd={addValueFilter} />
      </div>

      {isLoading ? (
        <CampaignsLoading />
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : (
        <KpiColorsProvider value={kpiColors}>
          <AdsTable
            data={filtered}
            columns={activePreset.columns}
            blur={blur}
            tagsMap={tagsMap}
            onToggle={toggle}
            onToggleInstance={async (instId, active, accId, name) => {
              await toggle(instId, active, [instId], accId, name);
            }}
          />
        </KpiColorsProvider>
      )}

      <PresetDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditingPreset(null);
        }}
        onSave={handleSavePreset}
        editingPreset={editingPreset}
      />

      <KpiColorsDrawer
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        kpiColors={kpiColors}
        onSave={saveKpiColors}
      />
    </div>
  );
}
