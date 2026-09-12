import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import type { AdInstanceData } from "@/services/ads";
import { allColumns } from "./columnPresets";
import { getCellValue, type MetricRow } from "@/pages/campaigns/components/campaignCellHelpers";
import { useKpiColorsContext } from "@/pages/campaigns/components/KpiColorsContext";
import { TooltipTableHead } from "@/pages/campaigns/components/TooltipTableHead";

interface AdInstancesSubTableProps {
  instances: AdInstanceData[];
  columns: string[];
  onToggle: (instanceId: string, active: boolean, accountId?: string, name?: string) => Promise<void>;
}

function instanceToMetricRow(i: AdInstanceData): MetricRow {
  return {
    name: i.name,
    spend: i.spend,
    revenue: i.revenue,
    sales: i.sales,
    roas: i.roas,
    cpa: i.cpa,
    cpc: i.cpc,
    clicks: i.clicks,
    impressions: i.impressions,
    ctr: i.ctr,
    landingPageViews: i.landing_page_views,
    initiateCheckout: i.initiate_checkout,
    connectRate: i.connect_rate,
    profit: i.profit,
    budget: i.budget,
    playsVsl: 0,
    playRate: 0,
  };
}

export function AdInstancesSubTable({
  instances,
  columns,
  onToggle,
}: AdInstancesSubTableProps) {
  const visibleCols = columns.filter((c) => c !== "name");
  const kpiColors = useKpiColorsContext();

  return (
    <div className="bg-muted/15 border-t border-border/30 px-4 py-2">
      <div className="mb-2 text-xs font-semibold text-muted-foreground flex items-center gap-2">
        <span>Instâncias por Campanha / Conjunto ({instances.length})</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="text-[10px] border-b border-border/20">
            <TooltipTableHead
              colKey="name"
              label="Campanha / Conjunto"
              className="pl-8 min-w-[240px]"
            />
            {visibleCols.map((col) => (
              <TooltipTableHead
                key={col}
                colKey={col}
                label={allColumns[col] || col}
                className="text-right"
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((inst) => {
            const row = instanceToMetricRow(inst);
            return (
              <TableRow key={inst.id} className="text-xs hover:bg-muted/20">
                <TableCell className="pl-8">
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      className="after:pointer-events-none"
                      checked={inst.status === "active"}
                      onCheckedChange={async (checked) => {
                        await onToggle(inst.id, checked, inst.account_id, inst.name);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium truncate max-w-[240px]" title={inst.campaign_name}>
                        {inst.campaign_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[240px]" title={inst.ad_set_name}>
                        {inst.ad_set_name}
                      </span>
                    </div>
                  </div>
                </TableCell>
                {visibleCols.map((col) => (
                  <TableCell key={col} className="text-right tabular-nums">
                    {getCellValue(row, col, kpiColors)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
