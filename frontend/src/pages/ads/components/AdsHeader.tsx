import {
  RiAdvertisementLine,
  RiSearchLine,
  RiSettings3Line,
  RiInformationLine,
  RiAddLine,
} from "@remixicon/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ColumnPreset } from "./columnPresets";
import { BlurToggle, type BlurState } from "@/pages/campaigns/components/BlurToggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshButton } from "@/components/RefreshButton";
import { PresetTab } from "@/pages/campaigns/components/PresetTab";

interface AdsHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  presets: ColumnPreset[];
  activePresetId: string;
  onPresetChange: (id: string) => void;
  onCreatePreset: () => void;
  onEditPreset?: (preset: ColumnPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  blur: BlurState;
  onBlurChange: (blur: BlurState) => void;
  onRefresh: () => Promise<void>;
  onOpenSettings: () => void;
  defaultPresetIds?: string[];
  lastSyncAt?: string | null;
}

export function AdsHeader({
  search,
  onSearchChange,
  presets,
  activePresetId,
  onPresetChange,
  onCreatePreset,
  onEditPreset,
  onDeletePreset,
  blur,
  onBlurChange,
  onRefresh,
  onOpenSettings,
  defaultPresetIds = [],
  lastSyncAt,
}: AdsHeaderProps) {
  const syncTimeStr = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <RiAdvertisementLine className="size-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Anúncios</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground cursor-help">
                      <RiInformationLine className="size-3" />
                      {syncTimeStr ? `Sync ${syncTimeStr}` : "Ao vivo"}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[280px]">
                    <p className="text-sm">
                      Anúncios consolidados pelo nome across todas as campanhas e conjuntos com vendas reais.
                      {syncTimeStr && <span className="block mt-1 font-medium">Última sincronização: {syncTimeStr}</span>}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground">
              Performance consolidada por criativo
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative w-full sm:w-auto">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar anúncio..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-full sm:w-[220px] h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <BlurToggle
              blur={blur}
              onBlurChange={onBlurChange}
            />
            <RefreshButton onRefresh={onRefresh} />
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
              onClick={onOpenSettings}
              title="Configurar cores dos KPIs"
            >
              <RiSettings3Line className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/60 border border-border/40 w-fit overflow-x-auto max-w-full">
        {presets.map((preset) => {
          const isDefault = defaultPresetIds.includes(preset.id);
          return (
            <PresetTab
              key={preset.id}
              preset={preset}
              isActive={activePresetId === preset.id}
              isDefault={isDefault}
              onClick={() => onPresetChange(preset.id)}
              onEdit={onEditPreset && !isDefault ? () => onEditPreset(preset) : undefined}
              onDelete={onDeletePreset && !isDefault ? () => onDeletePreset(preset.id) : undefined}
            />
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-md text-muted-foreground hover:text-foreground"
          onClick={onCreatePreset}
          title="Nova visualização de colunas"
        >
          <RiAddLine className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
