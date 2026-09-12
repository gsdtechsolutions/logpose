import { useState, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import type { AdGroupData } from "@/services/ads";
import { allColumns } from "./columnPresets";
import { AdNameCell } from "./AdNameCell";
import { AdInstancesSubTable } from "./AdInstancesSubTable";
import { cn } from "@/lib/utils";
import type { BlurState } from "@/pages/campaigns/components/BlurToggle";
import { getCellValue, getFooterValue, type MetricRow } from "@/pages/campaigns/components/campaignCellHelpers";
import { SortableTableHead } from "@/pages/campaigns/components/SortableTableHead";
import { useAdSort } from "./useAdSort";
import { useKpiColorsContext } from "@/pages/campaigns/components/KpiColorsContext";

interface AdsTableProps {
  data: AdGroupData[];
  columns: string[];
  blur?: BlurState;
  tagsMap?: Record<string, string[]>;
  onToggle: (adId: string, active: boolean, allInstanceIds?: string[], accountStr?: string, adName?: string) => Promise<void>;
  onToggleInstance: (instanceId: string, active: boolean, accountId?: string, name?: string) => Promise<void>;
}

function adToMetricRow(ad: AdGroupData): MetricRow {
  return {
    name: ad.name,
    spend: ad.spend,
    revenue: ad.revenue,
    sales: ad.sales,
    roas: ad.roas,
    cpa: ad.cpa,
    cpc: ad.cpc,
    clicks: ad.clicks,
    impressions: ad.impressions,
    ctr: ad.ctr,
    landingPageViews: ad.landing_page_views,
    initiateCheckout: ad.initiate_checkout,
    connectRate: ad.connect_rate,
    profit: ad.profit,
    budget: ad.budget,
    playsVsl: 0,
    playRate: 0,
  };
}

export function AdsTable({
  data,
  columns,
  blur = { name: false, values: false, hideUnidentified: false, hiddenProducts: [] },
  tagsMap = {},
  onToggle,
  onToggleInstance,
}: AdsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const visibleCols = columns.filter((c) => c !== "name");
  const blurClass = "blur-sm select-none";
  const kpiColors = useKpiColorsContext();
  const { sorted: sortedData, sortKey, toggleSort } = useAdSort(data);

  const metricsForFooter = sortedData.map(adToMetricRow);

  return (
    <Card className="border-border/40 premium-table overflow-hidden min-w-0">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  colKey="name"
                  label={allColumns.name}
                  sortKey={sortKey}
                  onSort={toggleSort}
                  className="min-w-[320px]"
                />
                {visibleCols.map((col) => (
                  <SortableTableHead
                    key={col}
                    colKey={col}
                    label={allColumns[col] || col}
                    sortKey={sortKey}
                    onSort={toggleSort}
                    className="text-right"
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="text-center py-12 text-muted-foreground">
                    Nenhum anúncio encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((ad) => {
                  const isExpanded = expandedId === ad.id;
                  const row = adToMetricRow(ad);
                  const tags = tagsMap[ad.id] || [];

                  return (
                    <Fragment key={ad.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/30",
                          isExpanded && "bg-muted/30"
                        )}
                        onClick={() => setExpandedId((prev) => (prev === ad.id ? null : ad.id))}
                      >
                        <TableCell>
                          <AdNameCell
                            ad={ad}
                            isExpanded={isExpanded}
                            blurName={blur.name}
                            tags={tags}
                            onToggle={async (active) => {
                              const ids = ad.instances.map((i) => i.id);
                              await onToggle(ad.id, active, ids, ad.account_id, ad.name);
                            }}
                          />
                        </TableCell>
                        {visibleCols.map((col) => (
                          <TableCell
                            key={col}
                            className={cn("text-right tabular-nums", blur.values && blurClass)}
                          >
                            {getCellValue(row, col, kpiColors)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && ad.instances.length > 0 && (
                        <TableRow key={`${ad.id}-instances`}>
                          <TableCell colSpan={visibleCols.length + 1} className="p-0">
                            <AdInstancesSubTable
                              instances={ad.instances}
                              columns={columns}
                              onToggle={onToggleInstance}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
            {sortedData.length > 0 && (
              <TableFooter>
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Total ({sortedData.length})</TableCell>
                  {visibleCols.map((col) => (
                    <TableCell
                      key={col}
                      className={cn("text-right tabular-nums", blur.values && blurClass)}
                    >
                      {getFooterValue(metricsForFooter, col)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
