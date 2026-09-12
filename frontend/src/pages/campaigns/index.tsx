import { useState, useMemo, useCallback, useEffect } from "react";
import { CampaignsHeader } from "./components/CampaignsHeader";
import { CampaignsTable } from "./components/CampaignsTable";
import { BottleneckTabs } from "./components/BottleneckTabs";
import { AdsView } from "./components/AdsView";
import { CampaignsKpis } from "./components/CampaignsKpis";
import { PresetDrawer } from "./components/PresetDrawer";
import { KpiColorsDrawer } from "./components/KpiColorsDrawer";
import { KpiColorsProvider } from "./components/KpiColorsContext";
import { defaultPresets, type ColumnPreset } from "./components/columnPresets";
import type { BlurState } from "./components/BlurToggle";
import { QuickFiltersBadges } from "@/components/QuickFiltersBadges";
import { AddValueFilterPopover } from "@/components/AddValueFilterPopover";
import { useCampaigns, useCampaignPresets } from "@/hooks/useCampaigns";
import { useCampaignTags } from "@/hooks/useCampaignTags";
import { useCampaignMarkers } from "@/hooks/useCampaignMarkers";
import { useVturbAccounts } from "@/hooks/useVturbAccounts";
import { useCampaignPrefetch } from "@/hooks/useCampaignPrefetch";
import { campaignToMetricRow } from "./components/mappers";
import { CampaignsLoading } from "./components/CampaignsLoading";
import { filterCampaigns } from "./components/filterCampaigns";
import { getDefaultDateRange } from "./components/dateHelpers";
import { useQuickFilters } from "./components/useQuickFilters";
import { useCampaignPageData } from "@/hooks/useCampaignPageData";
import { useKpiColors } from "@/hooks/useKpiColors";
import { useAllCampaignRows } from "./components/useAllCampaignRows";
import { useCampaignFilterState } from "./components/useCampaignFilterState";
import { invalidateCacheByPrefix } from "@/lib/queryCache";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DEFAULT_PRESET_IDS = defaultPresets.map((p) => p.id);

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ColumnPreset | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blur, setBlur] = useState<BlurState>({
    name: false, values: false, hideUnidentified: false, hiddenProducts: [],
  });

  const { tagsMap, allUniqueTags, updateTags } = useCampaignTags();
  const { markersMap, saveMarker } = useCampaignMarkers();
  const { accounts: vturbAccounts } = useVturbAccounts();
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
    campaigns, unidentified, metaError, lastSyncAt, isLoading, error,
    accounts: fbAccounts, activeAccountId, setSelectedAccountId,
    toggle, changeBudget, silentReload,
  } = useCampaigns(dateStart, dateEnd);

  const { filters, handleFilterChange, addValueFilter } = useCampaignFilterState(
    setSelectedAccountId, setDateStart, setDateEnd,
  );

  const navigate = useNavigate();
  useEffect(() => {
    if (metaError === "token_invalid") {
      toast.error("Token do Facebook Ads inválido", {
        description: "O token expirou. Atualize nas integrações.",
        action: { label: "Corrigir", onClick: () => navigate("/facebook-ads") },
        id: "meta-token-invalid",
      });
    }
  }, [metaError, navigate]);

  useCampaignPrefetch(activeAccountId);

  const handleRefresh = useCallback(async () => {
    invalidateCacheByPrefix("campaigns");
    await silentReload();
  }, [silentReload]);

  const allRows = useAllCampaignRows(campaigns, unidentified, blur);
  const filtered = useMemo(
    () => filterCampaigns(allRows, search, filters, tagsMap, markersMap),
    [allRows, search, filters, tagsMap, markersMap],
  );

  const quickFilters = useQuickFilters({
    filters,
    accounts: fbAccounts,
    markersMap,
    tags: allUniqueTags,
  });

  const metricsForKpi = filtered.map(campaignToMetricRow);
  useCampaignPageData(filtered, filters, dateStart, dateEnd);

  return (
    <div className="flex flex-col gap-6 p-6 min-w-0">
      <CampaignsHeader
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
        unidentifiedProducts={unidentified?.products ?? []}
        onRefresh={handleRefresh}
        onOpenSettings={() => setSettingsOpen(true)}
        defaultPresetIds={DEFAULT_PRESET_IDS}
        lastSyncAt={lastSyncAt}
      />
      <CampaignsKpis data={metricsForKpi} />
      <div className="flex flex-wrap items-center gap-2">
        <QuickFiltersBadges filters={quickFilters} onChange={handleFilterChange} />
        <AddValueFilterPopover onAdd={addValueFilter} />
      </div>
      {isLoading ? (
        <CampaignsLoading />
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : activePresetId === "gargalos" ? (
        <BottleneckTabs data={filtered} hasVturb={vturbAccounts.length > 0} dateStart={dateStart} dateEnd={dateEnd} />
      ) : (
        <KpiColorsProvider value={kpiColors}>
          {activePresetId === "anuncios" ? (
            <AdsView
              campaigns={filtered}
              columns={activePreset.columns}
              blur={blur}
              tagsMap={tagsMap}
              onToggle={toggle}
            />
          ) : (
            <CampaignsTable
              data={filtered}
              columns={activePreset.columns}
              blur={blur}
              tagsMap={tagsMap}
              markersMap={markersMap}
              onToggle={toggle}
              onBudgetChange={changeBudget}
              onSaveTags={async (id, tags) => { await updateTags(id, tags); }}
              onSaveMarker={async (id, type, refId, refLabel) => {
                await saveMarker(id, type, refId, refLabel);
              }}
              accountId={activeAccountId}
            />
          )}
        </KpiColorsProvider>
      )}
      <PresetDrawer
        open={drawerOpen}
        onOpenChange={(open) => { setDrawerOpen(open); if (!open) setEditingPreset(null); }}
        onSave={async (preset) => {
          if (editingPreset) await editPreset(Number(preset.id), preset.name, preset.columns);
          else await addPreset(preset.name, preset.columns);
          setEditingPreset(null);
        }}
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
